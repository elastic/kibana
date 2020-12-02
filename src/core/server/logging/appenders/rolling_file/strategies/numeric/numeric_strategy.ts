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

import { basename, dirname, join } from 'path';
import { schema } from '@kbn/config-schema';
import { readdir, unlink, rename, exists } from '../fs';
import { RollingStrategy } from '../strategy';
import { RollingFileContext } from '../../rolling_file_context';
import { getNumericMatcher, getNumericFileName } from './pattern_matcher';

export interface NumericRollingStrategyConfig {
  kind: 'numeric';
  /**
   * The suffix pattern to apply when renaming a file. The suffix will be applied
   * after the `appender.path` file name, but before the file extension.
   *
   * Must include `%i`, as it is the value that will be converted to the file index
   *
   * @example
   * ```yaml
   * logging:
   *   appenders:
   *     rolling-file:
   *       kind: rolling-file
   *       path: /var/logs/kibana.log
   *       strategy:
   *         type: default
   *         pattern: "-%i"
   *         max: 5
   * ```
   *
   * will create `/var/logs/kibana-1.log`, `/var/logs/kibana-2.log`, and so on.
   *
   * Defaults to `-%i`.
   */
  pattern: string;
  /**
   * The maximum number of files to keep. Once this number is reached, oldest
   * files will be deleted. Defaults to `7`
   */
  max: number;
}

export const numericRollingStrategyConfigSchema = schema.object({
  kind: schema.literal('numeric'),
  pattern: schema.string({
    defaultValue: '-%i',
    validate: (pattern) => {
      if (!pattern.includes('%i')) {
        return `pattern must include '%i'`;
      }
    },
  }),
  max: schema.number({ min: 1, defaultValue: 7 }),
});

/**
 * A rolling strategy that will suffix the file with a given pattern when rolling,
 * and will only retain a fixed amount of rolled files.
 *
 * @example
 * ```yaml
 * logging:
 *   appenders:
 *     rolling-file:
 *       kind: rolling-file
 *       path: /kibana.log
 *       strategy:
 *         type: numeric
 *         pattern: "-%i"
 *         max: 2
 * ```
 * - During the first rollover kibana.log is renamed to kibana-1.log. A new kibana.log file is created and starts
 *   being written to.
 * - During the second rollover kibana-1.log is renamed to kibana-2.log and kibana.log is renamed to kibana-1.log.
 *   A new kibana.log file is created and starts being written to.
 * - During the third and subsequent rollovers, kibana-2.log is deleted, kibana-1.log is renamed to kibana-2.log and
 *   kibana.log is renamed to kibana-1.log. A new kibana.log file is created and starts being written to.
 *
 * See {@link NumericRollingStrategyConfig} for more details.
 */
export class NumericRollingStrategy implements RollingStrategy {
  private readonly logFilePath;
  private readonly logFileBaseName;
  private readonly logFileFolder;

  constructor(
    private readonly config: NumericRollingStrategyConfig,
    private readonly context: RollingFileContext
  ) {
    this.logFilePath = this.context.filePath;
    this.logFileBaseName = basename(this.context.filePath);
    this.logFileFolder = dirname(this.context.filePath);
  }

  async rollout() {
    // in case of time-interval triggering policy, we can have an entire
    // interval without any log event. In that case, the log file is not even
    // present, and we should not perform the rollout
    if (!(await exists(this.logFilePath))) {
      return;
    }

    const matcher = getNumericMatcher(this.logFileBaseName, this.config.pattern);
    const dirContent = await readdir(this.logFileFolder);

    const orderedFiles = dirContent
      .map((fileName) => ({
        fileName,
        index: matcher(fileName),
      }))
      .filter(({ index }) => index !== undefined)
      .sort((a, b) => a.index! - b.index!)
      .map(({ fileName }) => fileName);

    const filesToRoll = orderedFiles.slice(0, this.config.max - 1);
    const filesToDelete = orderedFiles.slice(filesToRoll.length, orderedFiles.length);

    for (const fileToDelete of filesToDelete) {
      await unlink(join(this.logFileFolder, fileToDelete));
    }

    for (let i = filesToRoll.length - 1; i >= 0; i--) {
      const oldFileName = filesToRoll[i];
      const newFileName = getNumericFileName(this.logFileBaseName, this.config.pattern, i + 2);
      await rename(join(this.logFileFolder, oldFileName), join(this.logFileFolder, newFileName));
    }

    const currentFileNewName = getNumericFileName(this.logFileBaseName, this.config.pattern, 1);
    await rename(this.context.filePath, join(this.logFileFolder, currentFileNewName));

    // updates the context file info to mirror the new size and date
    this.context.refreshFileInfo();
  }
}
