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
