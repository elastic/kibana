/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ByteSizeValue } from '@kbn/config-schema';
import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { createEscapeValue } from '@kbn/data-plugin/common';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type { TaskInstanceFields } from '@kbn/reporting-common/types';
import {
  CSV_BOM_CHARS,
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_DATEFORMAT_TZ,
  UI_SETTINGS_SEARCH_INCLUDE_FROZEN,
} from '../../constants';
import { CsvPagingStrategy } from '../../types';

export interface CsvExportSettings {
  timezone: string;
  taskInstanceFields: TaskInstanceFields;
  scroll: {
    strategy?: CsvPagingStrategy;
    size: number;
    /**
     * compute scroll duration, duration is returned in ms by default
     */
    duration: (args: TaskInstanceFields, format?: 'ms' | 's') => string;
  };
  bom: string;
  separator: string;
  maxSizeBytes: number | ByteSizeValue;
  checkForFormulas: boolean;
  escapeFormulaValues: boolean;
  escapeValue: (value: string) => string;
  includeFrozen: boolean;
  maxConcurrentShardRequests: number;
}

export const getExportSettings = async (
  client: IUiSettingsClient,
  taskInstanceFields: TaskInstanceFields,
  config: ReportingConfigType['csv'],
  timezone: string | undefined,
  logger: Logger
): Promise<CsvExportSettings> => {
  let setTimezone: string;
  if (timezone) {
    setTimezone = timezone;
  } else {
    // timezone in settings?
    setTimezone = await client.get(UI_SETTINGS_DATEFORMAT_TZ);
    if (setTimezone === 'Browser') {
      // if `Browser`, hardcode it to 'UTC' so the export has data that makes sense
      logger.warn(
        `Kibana Advanced Setting "dateFormat:tz" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.`
      );
      setTimezone = 'UTC';
    }
  }

  // Advanced Settings that affect search export + CSV
  const [includeFrozen, separator, quoteValues] = await Promise.all([
    client.get(UI_SETTINGS_SEARCH_INCLUDE_FROZEN),
    client.get(UI_SETTINGS_CSV_SEPARATOR),
    client.get(UI_SETTINGS_CSV_QUOTE_VALUES),
  ]);

  const escapeFormulaValues = config.escapeFormulaValues;
  const escapeValue = createEscapeValue({
    separator,
    quoteValues,
    escapeFormulaValues,
  });
  const bom = config.useByteOrderMarkEncoding ? CSV_BOM_CHARS : '';

  return {
    timezone: setTimezone,
    taskInstanceFields,
    scroll: {
      strategy: config.scroll.strategy as CsvPagingStrategy,
      size: config.scroll.size,
      duration: ({ retryAt }, format = 'ms') => {
        if (config.scroll.duration !== 'auto') {
          return config.scroll.duration;
        }

        if (!retryAt) {
          throw new Error(
            'config "xpack.reporting.csv.scroll.duration" of "auto" mandates that the task instance field passed specifies a retryAt value'
          );
        }

        const now = new Date(Date.now()).getTime();
        const timeTillRetry = new Date(retryAt).getTime();

        if (now >= timeTillRetry) {
          return `0${format}`;
        }

        const _duration = timeTillRetry - now;
        const result = format === 'ms' ? `${_duration}ms` : `${_duration / 1000}s`;
        logger.debug(`using timeout duration of ${result} for csv scroll`);
        return result;
      },
    },
    bom,
    includeFrozen,
    separator,
    maxSizeBytes: config.maxSizeBytes,
    checkForFormulas: config.checkForFormulas,
    escapeFormulaValues,
    escapeValue,
    maxConcurrentShardRequests: config.maxConcurrentShardRequests,
  };
};
