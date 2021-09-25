/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { filter } from 'rxjs/operators';
import { TimeRange } from 'src/plugins/data/public';
import { DiscoverServices } from '../../build_services';
import { IndexPattern, isCompleteResponse, SearchSource } from '../../../../data/common';

export const useIndexPatternData = (
  indexPattern: DataView | undefined,
  services: DiscoverServices,
  onResult: (totalNrOfHits: number) => void,
  onError: (error: never) => void
) => {
  const { data, searchSourceService } = services;
  const timefilter = data.query.timefilter.timefilter;

  useEffect(() => {
    async function createSearchSource() {
      const searchSource = await searchSourceService.searchSource.create({type: 'index_pattern'});
      const timeRange: TimeRange = {
        from: 'now-7y',
        to: 'now',
        mode: 'relative',
      };
      const ip = (indexPattern as unknown) as IndexPattern;
      searchSource.setField('index', ip);
      searchSource.setField('trackTotalHits', true);
      searchSource.setField(
        'filter',
        data.query.timefilter.timefilter.createFilter(ip!, timeRange)
      );
      searchSource.setField('size', 0);
      searchSource.removeField('sort');
      searchSource.removeField('fields');
      searchSource.removeField('aggs');
      return searchSource;
    }

    if (!indexPattern) {
      return;
    }
    async function getIndexPatternData() {
      const searchSource = (await createSearchSource()) as SearchSource;
      const executionContext = {
        type: 'application',
        name: 'discover',
        description: 'fetch total documents in an index pattern',
        url: window.location.pathname,
        id: '',
      };
      const fetch$ = searchSource.fetch$({ executionContext }).pipe(
        filter((res) => {
          return isCompleteResponse(res);
        })
      );

      const response = await fetch$.toPromise();
      const totalHitsNr = response.rawResponse.hits.total as number;
      onResult(totalHitsNr);
    }

    getIndexPatternData();
  }, [
    data.query.timefilter.timefilter,
    indexPattern,
    onError,
    onResult,
    searchSourceService.searchSource,
    services,
    timefilter,
  ]);
};
