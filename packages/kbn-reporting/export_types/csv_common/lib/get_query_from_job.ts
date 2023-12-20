/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { durationToNumber } from '@kbn/reporting-common';

/**
 * Type to wrap the untyped object returned when
 * getting the query from SearchSource service
 */
export interface QueryInspection {
  requestBody: estypes.SearchRequest;
}

/**
 * @internal
 */
interface CsvConfigType {
  scroll: {
    size: number;
    duration: string;
  };
}

/**
 * A utility to get the query from a CSV reporting job to inspect or analyze
 * @public
 */
export const getQueryFromCsvJob = (
  searchSource: ISearchSource,
  { scroll: config }: CsvConfigType,
  pitId?: string
): QueryInspection => {
  // Max number of documents in each returned page
  searchSource.setField('size', durationToNumber(config.size));

  // Max time to wait for result
  searchSource.setField('timeout', config.duration);

  // Request high accuracy for calculating total hits
  searchSource.setField('trackTotalHits', true);

  if (pitId) {
    // Always use most recently provided PIT
    searchSource.setField('pit', {
      id: pitId,
      keep_alive: config.duration,
    });
  }

  return {
    requestBody: searchSource.getSearchRequestBody(),
  };
};
