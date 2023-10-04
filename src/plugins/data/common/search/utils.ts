/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { AggTypesDependencies } from '..';
import type { IKibanaSearchResponse } from './types';

/**
 * From https://github.com/elastic/elasticsearch/issues/55572: "When is_running is false, the query has stopped, which
 * may happen due to ... the search failed, in which case is_partial is set to true to indicate that any results that
 * may be included in the search response come only from a subset of the shards that the query should have hit."
 * @returns true if response had an error while executing in ES
 */
export const isErrorResponse = (response?: IKibanaSearchResponse) => {
  return (
    !response ||
    !response.rawResponse ||
    (!response.isRunning &&
      !!response.isPartial &&
      // See https://github.com/elastic/elasticsearch/pull/97731. For CCS with ccs_minimize_roundtrips=true, isPartial
      // is true if the search is complete but there are shard failures. In that case, the _clusters.details section
      // will have information about those failures. This will also likely be the behavior of CCS with
      // ccs_minimize_roundtrips=false and non-CCS after https://github.com/elastic/elasticsearch/issues/98913 is
      // resolved.
      !response.rawResponse?._clusters?.details)
  );
};

/**
 * @returns true if response is completed successfully
 */
export const isCompleteResponse = (response?: IKibanaSearchResponse) => {
  // Some custom search strategies do not indicate whether they are still running. In this case, assume it is complete.
  if (response && !response.hasOwnProperty('isRunning')) {
    return true;
  }

  return !isErrorResponse(response) && Boolean(response && !response.isRunning);
};

/**
 * @returns true if request is still running an/d response contains partial results
 */
export const isPartialResponse = (response?: IKibanaSearchResponse) => {
  return Boolean(response && response.isRunning && response.isPartial);
};

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
