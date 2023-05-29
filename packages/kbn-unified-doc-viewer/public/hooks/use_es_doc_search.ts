/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ESSearchRequest } from '@kbn/es-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { DocProps, ElasticRequestState } from '../types';
import { useUnifiedDocViewerServices } from './use_doc_view_services';

type RequestBody = Pick<ESSearchRequest, 'body'>;

/**
 * Custom react hook for querying a single doc in ElasticSearch
 */
export function useEsDocSearch({
  id,
  index,
  dataView,
  requestSource,
}: DocProps): [ElasticRequestState, SearchHit | null, () => void] {
  const [status, setStatus] = useState(ElasticRequestState.Loading);
  const [hit, setHit] = useState<SearchHit | null>(null);
  const { data, uiSettings } = useUnifiedDocViewerServices();

  // TODO: Use a const instead of hard-coding this value
  const useNewFieldsApi = useMemo(
    () => !uiSettings.get('discover:searchFieldsFromSource'),
    [uiSettings]
  );

  const requestData = useCallback(async () => {
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
        setHit(hits.hits[0]);
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
  }, [id, index, dataView, data.search, useNewFieldsApi, requestSource]);

  useEffect(() => {
    requestData();
  }, [requestData]);

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
  const { docvalueFields, runtimeFields, scriptFields, storedFields } =
    dataView.getComputedFields();
  const request: RequestBody = {
    body: {
      query: {
        bool: {
          filter: [{ ids: { values: [id] } }, { term: { _index: index } }],
        },
      },
      stored_fields: storedFields,
      script_fields: scriptFields,
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
  request.body.fields = [...(request.body?.fields || []), ...(docvalueFields || [])];
  return request;
}
