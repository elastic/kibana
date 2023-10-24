/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { Moment } from 'moment';
import { isNumber, isString, castArray, range, random } from 'lodash';
import parser from 'datemath-parser';
import { PassThrough, Readable, Writable } from 'stream';
import { timerange } from '@kbn/apm-synthtrace-client';
import { isGeneratorObject } from 'util/types';
import * as rt from 'io-ts';
import { getScenario } from './get_scenario';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';
import { Logger } from '../../lib/utils/create_logger';
import { bootstrap } from './bootstrap';
import { RunOptions } from './parse_run_cli_flags';
import { ApmSynthtraceEsClient } from '../../lib/apm/client/apm_synthtrace_es_client';

interface Schedule {
  scenario: string;
  start: number;
  end: number | boolean;
  interval?: number;
  eventsPerCycle: EventsPerCycle;
}

type TransitionMethod = 'linear' | 'exp' | 'sine';

const TransitionMethodRT = rt.keyof({
  linear: null,
  exp: null,
  sine: null,
});

export const EventsPerCycleTransitionDefRT = rt.intersection([
  rt.type({
    start: rt.number,
    end: rt.number,
    method: TransitionMethodRT,
  }),
  rt.partial({
    options: rt.partial({
      period: rt.number,
    }),
  }),
]);

type EventsPerCycle =
  | number
  | {
      start: number;
      end: number;
      method: TransitionMethod;
    };

interface ParsedSchedule {
  scenario: string;
  start: number;
  end: number | boolean;
  interval?: number;
  eventsPerCycle: EventsPerCycle;
  randomness?: number;
}

export interface Config {
  schedule: Schedule[];
}

const DEFAULT_INTERVAL = 60000;

const parseSchedule = (now: Moment) => (schedule: Schedule) => {
  const startTs = isNumber(schedule.start)
    ? schedule.start
    : parser.parse(schedule.start, now.valueOf(), false);

  const endTs = isNumber(schedule.end)
    ? schedule.end
    : isString(schedule.end)
    ? parser.parse(schedule.end, now.valueOf(), false)
    : false;
  return { ...schedule, start: startTs, end: endTs };
};

interface Point {
  x: number;
  y: number;
}

function createExponentialFunction(start: Point, end: Point) {
  const totalPoints = end.x - start.x;
  const ratio = end.y / start.y;
  const exponent = Math.log(ratio) / (totalPoints - 1);
  return (timestamp: Moment) => {
    const x = timestamp.valueOf() - start.x;
    return Math.round(start.y * Math.exp(exponent * x));
  };
}

function createSineFunction(start: Point, end: Point, period = 60) {
  const midline = start.y;
  const amplitude = end.y;
  return (timestamp: Moment) => {
    const x = (timestamp.valueOf() - start.x) / 1000;
    const y = midline + amplitude * Math.sin(((2 * Math.PI) / period) * x);
    if (y < 0) {
      return 0;
    }
    return y;
  };
}

function createLinearFunction(start: Point, end: Point) {
  const slope = (end.y - start.y) / (end.x - start.x);
  const intercept = start.y - slope * start.x;
  return (timestamp: Moment) => {
    return slope * timestamp.valueOf() + intercept;
  };
}

function createEventsPerCycleFn(
  schedule: ParsedSchedule,
  eventsPerCycle: EventsPerCycle
): (timestamp: Moment) => number {
  if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && isNumber(schedule.end)) {
    const startPoint = { x: schedule.start, y: eventsPerCycle.start };
    const endPoint = { x: schedule.end, y: eventsPerCycle.end };
    if (eventsPerCycle.method === 'exp') {
      return createExponentialFunction(startPoint, endPoint);
    }
    if (eventsPerCycle.method === 'sine') {
      return createSineFunction(startPoint, endPoint, 60); // TODO add  eventsPerCycle.options?.period
    }
    return createLinearFunction(startPoint, endPoint);
  } else if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && schedule.end === false) {
    // eslint-disable-next-line no-console
    console.log('EventsPerCycle must be a number if the end value of schedule is false.');
  }

  return (_timestamp: Moment) =>
    typeof eventsPerCycle === 'number' ? eventsPerCycle : eventsPerCycle.end;
}

export async function wait(delay: number, logger: Logger) {
  logger.info(`Waiting ${delay}ms`);
  await new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export async function createEvents(
  config: Config,
  schedule: ParsedSchedule,
  end: Moment | false,
  currentTimestamp: Moment,
  continueIndexing = false,
  logger: Logger,
  stream: PassThrough,
  apmEsClient: ApmSynthtraceEsClient
): Promise<void> {
  const scenarioFile = `../../config/scenarios/${schedule.scenario}`;
  const scenario = await getScenario({ file: scenarioFile, logger });
  const { generate } = await scenario({
    logLevel: 1,
    file: '',
    config: undefined,
    target: undefined,
    kibana: undefined,
    clean: false,
    workers: undefined,
    concurrency: 0,
    versionOverride: undefined,
    scenarioOpts: undefined,
    logger,
  });

  const eventsPerCycle = schedule.eventsPerCycle || 1;
  const interval = DEFAULT_INTERVAL;
  const calculateEventsPerCycle = createEventsPerCycleFn(schedule, eventsPerCycle);
  const totalEvents = calculateEventsPerCycle(currentTimestamp);

  if (totalEvents > 0) {
    const epc = schedule.randomness
      ? random(
          Math.round(totalEvents - totalEvents * schedule.randomness),
          Math.round(totalEvents + totalEvents * schedule.randomness)
        )
      : totalEvents;
    const next = range(epc)
      .map((i) => {
        const eventTimestamp = moment(
          random(currentTimestamp.valueOf(), currentTimestamp.valueOf() + interval)
        );
        return generate({ range: timerange(eventTimestamp, end) });
      })
      .flat();

    const concatenatedStream = castArray(next)
      .reverse()
      .reduce<Writable>((prev, current) => {
        const currentStream = isGeneratorObject(current) ? Readable.from(current) : current;
        return currentStream.pipe(prev);
      }, new PassThrough({ objectMode: true }).setMaxListeners(100));

    concatenatedStream.pipe(stream, { end: false });
    await awaitStream(concatenatedStream);
  }

  await apmEsClient.refresh();

  const endTs = end === false ? moment() : end;
  if (currentTimestamp.isBefore(endTs)) {
    return createEvents(
      config,
      schedule,
      end,
      currentTimestamp.add(DEFAULT_INTERVAL, 'ms'),
      continueIndexing,
      logger,
      stream,
      apmEsClient
    );
  }
  if (currentTimestamp.isSameOrAfter(endTs) && continueIndexing) {
    await wait(DEFAULT_INTERVAL, logger);
    return createEvents(
      config,
      schedule,
      end,
      currentTimestamp.add(DEFAULT_INTERVAL, 'ms'),
      continueIndexing,
      logger,
      stream,
      apmEsClient
    );
  }
  logger.info(`Indexing complete for ${schedule.scenario} events.`);
}

export async function indexSchedule(config: Config, runOptions: RunOptions) {
  const { apmEsClient, logger } = await bootstrap(runOptions);

  const now = moment();

  const compiledSchedule = config.schedule.map(parseSchedule(now));
  const stream = new PassThrough({
    objectMode: true,
  }).setMaxListeners(100);
  apmEsClient.index(stream);
  for (const schedule of compiledSchedule) {
    const interval = schedule.interval ?? DEFAULT_INTERVAL;
    const startTs = moment(schedule.start);
    const end =
      schedule.end === false && startTs.isAfter(now)
        ? moment(schedule.start + interval)
        : isNumber(schedule.end)
        ? moment(schedule.end)
        : false;
    // We add one interval to the start to prevent overlap with the previous schedule.
    if (end !== false && end.isBefore(startTs)) {
      const errorMessage = `Start (${startTs.toISOString()} must come before the end (${end.toISOString()}))`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    logger.info(
      `Indexing "${schedule.scenario}" events from ${startTs.toISOString()} to ${
        end === false ? 'indefinatly' : end.toISOString()
      }`
    );

    await createEvents(
      config,
      schedule,
      end,
      startTs.clone().add('interval', 'ms'),
      schedule.end === false,
      logger,
      stream,
      apmEsClient
    );
  }
}
