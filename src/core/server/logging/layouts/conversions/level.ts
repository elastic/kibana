/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import chalk from 'chalk';

import { Conversion } from './type';
import { LogLevel } from '../../log_level';
import { LogRecord } from '../../log_record';

const LEVEL_COLORS = new Map([
  [LogLevel.Fatal, chalk.red],
  [LogLevel.Error, chalk.red],
  [LogLevel.Warn, chalk.yellow],
  [LogLevel.Debug, chalk.green],
  [LogLevel.Trace, chalk.blue],
]);

export const LevelConversion: Conversion = {
  pattern: /%level/g,
  convert(record: LogRecord, highlight: boolean) {
    let message = record.level.id.toUpperCase().padEnd(5);
    if (highlight && LEVEL_COLORS.has(record.level)) {
      const color = LEVEL_COLORS.get(record.level)!;
      message = color(message);
    }
    return message;
  },
};
