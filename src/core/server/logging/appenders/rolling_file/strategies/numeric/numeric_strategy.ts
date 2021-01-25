/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { basename, dirname } from 'path';
import { schema } from '@kbn/config-schema';
import { RollingStrategy } from '../strategy';
import { RollingFileContext } from '../../rolling_file_context';
import {
  shouldSkipRollout,
  getOrderedRolledFiles,
  deleteFiles,
  rollCurrentFile,
  rollPreviousFilesInOrder,
} from './rolling_tasks';

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
  max: schema.number({ min: 1, max: 100, defaultValue: 7 }),
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
    const logFilePath = this.logFilePath;
    const logFileBaseName = this.logFileBaseName;
    const logFileFolder = this.logFileFolder;
    const pattern = this.config.pattern;

    if (await shouldSkipRollout({ logFilePath })) {
      return;
    }

    // get the files matching the pattern in the folder, and sort them by `%i` value
    const orderedFiles = await getOrderedRolledFiles({
      logFileFolder,
      logFileBaseName,
      pattern,
    });
    const filesToRoll = orderedFiles.slice(0, this.config.max - 1);
    const filesToDelete = orderedFiles.slice(filesToRoll.length, orderedFiles.length);

    if (filesToDelete.length > 0) {
      await deleteFiles({ logFileFolder, filesToDelete });
    }

    if (filesToRoll.length > 0) {
      await rollPreviousFilesInOrder({ filesToRoll, logFileFolder, logFileBaseName, pattern });
    }

    await rollCurrentFile({ pattern, logFileBaseName, logFileFolder });

    // updates the context file info to mirror the new size and date
    // this is required for the time based policy, as the next time check
    // will be performed before the file manager updates the context itself by reopening
    // a writer to the new file.
    this.context.refreshFileInfo();
  }
}
