/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from 'yaml';
import fs from 'fs';

export async function readConfig(filePath: string) {
  const data = await fs.promises.readFile(filePath);
  return parse(data.toString());
}

export async function createConfig(configFile: string) {
  const data = await fs.promises.readFile(configFile);
  return parse(data.toString());
}

type TransitionMethod = 'linear' | 'exp' | 'sine';

type EventsPerCycle =
  | number
  | {
      start: number;
      end: number;
      method: TransitionMethod;
    };

export interface ParsedSchedule {
  template: string;
  start: number;
  end: number | boolean;
}
export interface Schedule {
  template: string;
  start: string;
  end: string | boolean;
  eventsPerCycle: EventsPerCycle;
}

export interface Config {
  schedule: Schedule[];
}
