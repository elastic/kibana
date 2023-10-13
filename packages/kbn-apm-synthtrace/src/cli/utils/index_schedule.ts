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
import { getScenario } from './get_scenario';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';

interface Schedule {
  template: string;
  start: number;
  end: number | boolean;
  interval?: number;
}

interface ParsedSchedule {
  template: string;
  start: string;
  end: string | boolean;
  interval?: number;
}

export interface Config {
  schedule: Schedule[];
}

const DEFAULT_INTERVAL = 60000;

const parseSchedule = (now: Moment) => (schedule: Schedule) => {
  const startTs = isNumber(schedule.start)
    ? schedule.start
    : parser.parse(schedule.start, { momentInstance: now.valueOf(), roundUp: false });
  const endTs = isNumber(schedule.end)
    ? schedule.end
    : isString(schedule.end)
    ? parser.parse(schedule.end, { momentInstance: now.valueOf(), roundUp: true })
    : false;
  return { ...schedule, start: startTs, end: endTs };
};

function createExponentialFunction(start, end) {
  const totalPoints = end.x - start.x;
  const ratio = end.y / start.y;
  const exponent = Math.log(ratio) / (totalPoints - 1);
  return (timestamp: Moment) => {
    const x = timestamp.valueOf() - start.x;
    return Math.round(start.y * Math.exp(exponent * x));
  };
}

function createEventsPerCycleFn(
  schedule: ParsedSchedule,
  eventsPerCycle
): (timestamp: Moment) => number {
  // if (isNumber(schedule.end)) {
  //   const startPoint = { x: schedule.start, y: eventsPerCycle.start };
  //   const endPoint = { x: schedule.end, y: eventsPerCycle.end };

  //   return createExponentialFunction(startPoint, endPoint);
  // } else if (schedule.end === false) {
  //   console.log('EventsPerCycle must be a number if the end value of schedule is false.');
  // }

  return (_timestamp: Moment) => eventsPerCycle;
}

export async function wait(delay: number) {
  console.log(`Waiting ${delay}ms`);
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
  logger,
  stream,
  apmEsClient
) {
  let scenarioFile = '../../scenarios/simple_trace.ts';
  const template = schedule.template;
  if (template === 'good') {
    scenarioFile = '../../scenarios/simple_trace.ts';
  } else if (schedule.template === 'bad') {
    scenarioFile = '../../scenarios/high_throughput.ts';
  } else if (schedule.template === 'good_and_bad') {
    scenarioFile = '../../scenarios/low_throughput.ts';
  }

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

  const eventsPerCycle = 1;
  const interval = DEFAULT_INTERVAL;
  const calculateEventsPerCycle = createEventsPerCycleFn(schedule, eventsPerCycle);
  const totalEvents = calculateEventsPerCycle(currentTimestamp);
  console.log(totalEvents, '!!totalEvents');

  const eventTimestamp = moment(
    random(currentTimestamp.valueOf(), currentTimestamp.valueOf() + interval)
  );
  const next = logger.perf('execute_scenario', () =>
    generate({ range: timerange(eventTimestamp, end) })
  );

  const concatenatedStream = castArray(next)
    .reverse()
    .reduce<Writable>((prev, current) => {
      const currentStream = isGeneratorObject(current) ? Readable.from(current) : current;
      return currentStream.pipe(prev);
    }, new PassThrough({ objectMode: true }));

  concatenatedStream.pipe(stream, { end: false });

  await awaitStream(concatenatedStream);

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
    await wait(DEFAULT_INTERVAL);
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
  logger.info(`Indexing complete for ${schedule.template} events.`);
}

export async function indexSchedule(config: Config, apmEsClient, logger) {
  console.log(config, '!!config');
  const now = moment();
  const compiledSchedule = config.schedule.map(parseSchedule(now));
  const stream = new PassThrough({
    objectMode: true,
  });
  apmEsClient.index(stream);
  for (const schedule of compiledSchedule) {
    console.log(compiledSchedule, '!!compiled');
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
      console.log(errorMessage);
      throw new Error(errorMessage);
    }
    console.log(
      `Indexing "${schedule.template}" events from ${startTs.toISOString()} to ${
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

/**
 * // read the template
    // if good, get specific scenario
    // if bad, get a bad scenario
    // if good_and_bad get a good_bad_scenario
    let scenarioFile;
    // TODO change the scenario files
    // Probably move all this logic inside a new createEvents function
    if (schedule.template === 'good') {
      scenarioFile = '../../scenarios/simple_trace.ts';
    } else if (schedule.template === 'bad') {
      scenarioFile = '../../scenarios/high_throughput.ts';
    } else if (schedule.template === 'good_and_bad') {
      scenarioFile = '../../scenarios/low_throughput.ts';
    }
    const scenario = await getScenario({ file: scenarioFile, logger });
    const { generate } = await scenario({ ...runOptions, logger });
    index++;

 */
