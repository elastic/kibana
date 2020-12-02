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
import { readdir, unlink, rename } from './fs';
import { RollingStrategy } from './strategy';
import { RollingFileContext } from '../rolling_file_context';
import { getNumericMatcher, getNumericFileName } from './numeric_pattern_matcher';

// TODO: rename to `numeric` & create `date`
export interface DefaultRollingStrategyConfig {
  kind: 'default';
  /**
   * The suffix pattern to apply when renaming a file. The suffix will be applied
   * after the `appender.path` file name, but before the file extension.
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
   * Defaults to '-%i'.
   */
  pattern: string;
  /**
   * The maximum number of files to keep. Once this number is reached, oldest
   * files will be deleted. Defaults to `7`
   */
  max: number;
}

// %d{MM-dd-yyyy}
// %i

export const defaultRollingStrategyConfigSchema = schema.object({
  kind: schema.literal('default'),
  pattern: schema.string({ defaultValue: '-%i' }), // TODO: validate
  max: schema.number({ min: 1, defaultValue: 7 }),
});

export class DefaultRollingStrategy implements RollingStrategy {
  constructor(
    private readonly filepath: string,
    private readonly config: DefaultRollingStrategyConfig,
    context: RollingFileContext
  ) {}

  async rollout() {
    // console.log('***** performing rolling');

    const logFileBaseName = basename(this.filepath);
    const logFileFolder = dirname(this.filepath);

    const matcher = getNumericMatcher(logFileBaseName, this.config.pattern);
    const dirContent = await readdir(logFileFolder);

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
      // console.log('*** will delete ', fileToDelete);

      await unlink(join(logFileFolder, fileToDelete));
    }

    for (let i = filesToRoll.length - 1; i >= 0; i--) {
      const oldFileName = filesToRoll[i];
      const newFileName = getNumericFileName(logFileBaseName, this.config.pattern, i + 2);
      // console.log('*** will roll ', oldFileName, newFileName);
      await rename(join(logFileFolder, oldFileName), join(logFileFolder, newFileName));
    }

    const currentFileNewName = getNumericFileName(logFileBaseName, this.config.pattern, 1);
    // console.log('*** will roll ', logFileBaseName, currentFileNewName);
    await rename(this.filepath, join(logFileFolder, currentFileNewName));
  }
}
