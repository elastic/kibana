/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from 'yaml';
import { isNumber, isString } from 'lodash';
import parser from 'datemath-parser';

import fs from 'fs';
import moment, { Moment } from 'moment';
import { Fields } from '@kbn/apm-synthtrace-client';
import { ApmFields } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../scenario';
import { RunOptions } from './parse_run_cli_flags';
import { Logger } from '../../lib/utils/create_logger';
import { getScenario } from './get_scenario';

export async function readConfig(filePath: string) {
  const data = await fs.promises.readFile(filePath);
  return parse(data.toString());
}

export async function createConfig(configFile: string) {
  const config = await readConfig(configFile);
  return config;
}

export interface ParsedSchedule {
  template: string;
  start: number;
  end: number | boolean;
}
export interface Schedule {
  template: string;
  start: string;
  end: string | boolean;
}

export interface Config {
  schedule: Schedule[];
}

const parseSchedule =
  (now: Moment) =>
  (schedule: Schedule): ParsedSchedule => {
    const startTs = isNumber(schedule.start)
      ? schedule.start
      : parser.parse(schedule.start, now.valueOf(), false);
    const endTs = isNumber(schedule.end)
      ? schedule.end
      : isString(schedule.end)
      ? parser.parse(schedule.end, now.valueOf(), true)
      : false;
    return { ...schedule, start: startTs, end: endTs };
  };

/**
 * In highcardinality this function
 * - is called indexSchedule
 * - it does the indexing
 * - createEvents calls the generateEvent function, similar to the generate event of the scenario
 *  */

/**
 * TODO think how I should call the function
 *
 */
export async function getScenarioFromSchedule(
  config: Config,
  logger: Logger,
  runOptions: RunOptions
) {
  const now = moment();
  const compiledSchedule = config.schedule.map(parseSchedule(now));
  console.log(compiledSchedule, '!!compiledSchedule');
  let index = 0;
  for (const schedule of compiledSchedule) {
    console.log(schedule, '!!index');
    // TODO add interval
    const startTs = moment(schedule.start);
    const end =
      schedule.end === false && startTs.isAfter(now)
        ? moment(schedule.start)
        : isNumber(schedule.end)
        ? moment(schedule.end)
        : false;
    // We add one interval to the start to prevent overlap with the previous schedule.
    if (end !== false && end.isBefore(startTs)) {
      const errorMessage = `Start (${startTs.toISOString()} must come before the end (${end.toISOString()}))`;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }

    // read the template
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
    return { generate };

    console.log(
      `Indexing "${schedule.template}" events from ${startTs.toISOString()} to ${
        end === false ? 'indefinatly' : end.toISOString()
      }`
    );

    // await createEvents(
    //   config,
    //   schedule,
    //   end,
    //   startTs.clone().add(6000, 'ms'),
    //   schedule.end === false
    // );
  }
}
