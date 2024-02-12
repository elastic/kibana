/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { SEARCH_FIELDS_FROM_SOURCE, buildDataTableRecord } from '@kbn/discover-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../plugin';

type RequestBody = Pick<estypes.SearchRequest, 'body'>;

export interface EsDocSearchProps {
  /**
   * Id of the doc in ES
   */
  id: string;
  /**
   * Index in ES to query
   */
  index: string;
  /**
   * DataView entity
   */
  dataView: DataView;
  /**
   * If set, will always request source, regardless of the global `fieldsFromSource` setting
   */
  requestSource?: boolean;
  /**
   * Records fetched from text based query
   */
  textBasedHits?: DataTableRecord[];
}

/**
 * Custom react hook for querying a single doc in ElasticSearch
 */
export function useEsDocSearch({
  id,
  index,
  dataView,
  requestSource,
  textBasedHits,
}: EsDocSearchProps): [ElasticRequestState, DataTableRecord | null, () => void] {
  const [status, setStatus] = useState(ElasticRequestState.Loading);
  const [hit, setHit] = useState<DataTableRecord | null>(null);
  const { data, uiSettings, analytics } = getUnifiedDocViewerServices();
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const requestData = useCallback(async () => {
    const singleDocFetchingStartTime = window.performance.now();
    try {
      const result = await lastValueFrom(
        data.search.search({
          params: {
            index: dataView.getIndexPattern(),
            body: buildSearchBody(id, index, dataView, useNewFieldsApi, requestSource)?.body,
          },
        })
      );
      const rawResponse = result.rawResponse;

      const hits = rawResponse.hits;

      if (hits?.hits?.[0]) {
        setStatus(ElasticRequestState.Found);
        setHit(buildDataTableRecord(hits.hits[0], dataView));
      } else {
        setStatus(ElasticRequestState.NotFound);
      }
    } catch (err) {
      if (err.savedObjectId) {
        setStatus(ElasticRequestState.NotFoundDataView);
      } else if (err.status === 404) {
        setStatus(ElasticRequestState.NotFound);
      } else {
        setStatus(ElasticRequestState.Error);
      }
    }

    if (analytics) {
      const singleDocFetchingDuration = window.performance.now() - singleDocFetchingStartTime;
      reportPerformanceMetricEvent(analytics, {
        eventName: 'discoverSingleDocFetch',
        duration: singleDocFetchingDuration,
      });
    }
  }, [analytics, data.search, dataView, id, index, useNewFieldsApi, requestSource]);

  useEffect(() => {
    if (textBasedHits) {
      const selectedHit = textBasedHits?.find((r) => r.id === id);
      if (selectedHit) {
        setStatus(ElasticRequestState.Found);
        setHit(selectedHit);
      }
    } else {
      requestData();
    }
  }, [id, requestData, textBasedHits]);

  return [status, hit, requestData];
}

/**
 * helper function to build a query body for Elasticsearch
 * https://www.elastic.co/guide/en/elasticsearch/reference/current//query-dsl-ids-query.html
 */
export function buildSearchBody(
  id: string,
  index: string,
  dataView: DataView,
  useNewFieldsApi: boolean,
  requestAllFields?: boolean
): RequestBody | undefined {
  const computedFields = dataView.getComputedFields();
  const runtimeFields = computedFields.runtimeFields as estypes.MappingRuntimeFields;
  const request: RequestBody = {
    body: {
      query: {
        bool: {
          filter: [{ ids: { values: [id] } }, { term: { _index: index } }],
        },
      },
      stored_fields: ['*'],
      script_fields: computedFields.scriptFields,
      version: true,
    },
  };
  if (!request.body) {
    return undefined;
  }
  if (useNewFieldsApi) {
    // @ts-expect-error
    request.body.fields = [{ field: '*', include_unmapped: 'true' }];
    request.body.runtime_mappings = runtimeFields ? runtimeFields : {};
    if (requestAllFields) {
      request.body._source = true;
    }
  } else {
    request.body._source = true;
  }
  request.body.fields = [...(request.body?.fields || []), ...(computedFields.docvalueFields || [])];
  return request;
}
