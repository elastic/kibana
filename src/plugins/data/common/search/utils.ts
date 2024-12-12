/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { AggTypesDependencies, GetConfigFn, UI_SETTINGS } from '..';

// TODO - investigate if this check is still needed
// There are no documented work flows where response or rawResponse is not returned
// Leaving check to prevent breaking changes until full investigation can be completed.
/**
 * @returns true if response is abort
 */
export const isAbortResponse = (
  response?: IKibanaSearchResponse | { response: IKibanaSearchResponse }
) => {
  return !response || !('rawResponse' in response || 'response' in response);
};

/**
 * @returns true if request is still running
 */
export const isRunningResponse = (response?: IKibanaSearchResponse) => response?.isRunning ?? false;

export const getUserTimeZone = (
  getConfig: AggTypesDependencies['getConfig'],
  shouldDetectTimezone: boolean = true
) => {
  const defaultTimeZone = 'UTC';
  const userTimeZone = getConfig<string>('dateFormat:tz');

  if (userTimeZone === 'Browser') {
    if (!shouldDetectTimezone) {
      return defaultTimeZone;
    }

    // If the typeMeta data index template does not have a timezone assigned to the selected field, use the configured tz
    const detectedTimezone = moment.tz.guess();
    const tzOffset = moment().format('Z');

    return detectedTimezone || tzOffset;
  }

  return userTimeZone ?? defaultTimeZone;
};

const defaultSessionId = `${Date.now()}`;

export function getEsPreference(
  getConfigFn: GetConfigFn,
  sessionId = defaultSessionId
): SearchRequest['preference'] {
  const setPreference = getConfigFn<string>(UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE);
  if (setPreference === 'sessionId') return `${sessionId}`;
  const customPreference = getConfigFn<string>(UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE);
  return setPreference === 'custom' ? customPreference : undefined;
}
