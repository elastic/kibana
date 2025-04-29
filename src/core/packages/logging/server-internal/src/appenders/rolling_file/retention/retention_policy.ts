/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname, join } from 'path';
import { schema } from '@kbn/config-schema';
import type { RetentionPolicyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../rolling_file_context';
import { deleteFiles } from './fs';
import { listFilesExceedingSize, listFilesOlderThan } from './utils';

export const retentionPolicyConfigSchema = schema.object(
  {
    maxFiles: schema.maybe(schema.number({ min: 1, max: 365 })),
    maxAccumulatedFileSize: schema.maybe(schema.byteSize()),
    removeOlderThan: schema.maybe(schema.duration({ max: '365d' })),
  },
  {
    validate: (config) => {
      if (!config.maxFiles && !config.maxAccumulatedFileSize && !config.removeOlderThan) {
        return 'Retention policy must define at least one directive: maxFiles, maxAccumulatedFileSize or removeOlderThan';
      }
    },
  }
);

export interface RetentionPolicy {
  /**
   * Apply the configured policy, checking the existing log files bound to the appender
   * and disposing of those that should.
   */
  apply(): Promise<void>;
}

export class GenericRetentionPolicy implements RetentionPolicy {
  private readonly logFileFolder;

  constructor(
    private readonly config: RetentionPolicyConfig,
    private readonly context: RollingFileContext
  ) {
    this.logFileFolder = dirname(this.context.filePath);
  }

  async apply() {
    const { maxFiles, maxAccumulatedFileSize, removeOlderThan } = this.config;
    const orderedFilesBaseNames = await this.context.getOrderedRolledFiles();
    const absOrderedFiles = orderedFilesBaseNames.map((filepath) =>
      join(this.logFileFolder, filepath)
    );

    const filesToDelete: Set<string> = new Set();

    if (maxFiles) {
      const exceedingFiles = absOrderedFiles.slice(maxFiles, absOrderedFiles.length);
      exceedingFiles.forEach((file) => filesToDelete.add(file));
    }

    if (maxAccumulatedFileSize) {
      const toRemoveByFileSize = await listFilesExceedingSize({
        orderedFiles: absOrderedFiles,
        maxSizeInBytes: maxAccumulatedFileSize.getValueInBytes(),
      });
      toRemoveByFileSize.forEach((file) => filesToDelete.add(file));
    }

    if (removeOlderThan) {
      const toRemoveByAge = await listFilesOlderThan({
        orderedFiles: absOrderedFiles,
        duration: removeOlderThan,
      });
      toRemoveByAge.forEach((file) => filesToDelete.add(file));
    }

    if (filesToDelete.size > 0) {
      await deleteFiles({
        filesToDelete: [...filesToDelete],
      });
    }
  }
}
