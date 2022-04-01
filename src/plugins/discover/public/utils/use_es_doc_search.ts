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
import { DataView } from '../../../data_views/public';
import { DocProps } from '../application/doc/components/doc';
import { ElasticRequestState } from '../application/doc/types';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../common';
import { ElasticSearchHit } from '../types';
import { useDiscoverServices } from './use_discover_services';

type RequestBody = Pick<estypes.SearchRequest, 'body'>;

/**
 * helper function to build a query body for Elasticsearch
 * https://www.elastic.co/guide/en/elasticsearch/reference/current//query-dsl-ids-query.html
 */
export function buildSearchBody(
  id: string,
  indexPattern: DataView,
  useNewFieldsApi: boolean,
  requestAllFields?: boolean
): RequestBody | undefined {
  const computedFields = indexPattern.getComputedFields();
  const runtimeFields = computedFields.runtimeFields as estypes.MappingRuntimeFields;
  const request: RequestBody = {
    body: {
      query: {
        ids: {
          values: [id],
        },
      },
      stored_fields: computedFields.storedFields,
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

/**
 * Custom react hook for querying a single doc in ElasticSearch
 */
export function useEsDocSearch({
  id,
  index,
  indexPattern,
  requestSource,
}: DocProps): [ElasticRequestState, ElasticSearchHit | null, () => void] {
  const [status, setStatus] = useState(ElasticRequestState.Loading);
  const [hit, setHit] = useState<ElasticSearchHit | null>(null);
  const { data, uiSettings } = useDiscoverServices();
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const requestData = useCallback(async () => {
    try {
      const { rawResponse } = await lastValueFrom(
        data.search.search({
          params: {
            index,
            body: buildSearchBody(id, indexPattern, useNewFieldsApi, requestSource)?.body,
          },
        })
      );

      const hits = rawResponse.hits;

      if (hits?.hits?.[0]) {
        setStatus(ElasticRequestState.Found);
        setHit(hits.hits[0]);
      } else {
        setStatus(ElasticRequestState.NotFound);
      }
    } catch (err) {
      if (err.savedObjectId) {
        setStatus(ElasticRequestState.NotFoundIndexPattern);
      } else if (err.status === 404) {
        setStatus(ElasticRequestState.NotFound);
      } else {
        setStatus(ElasticRequestState.Error);
      }
    }
  }, [id, index, indexPattern, data.search, useNewFieldsApi, requestSource]);

  useEffect(() => {
    requestData();
  }, [requestData]);

  return [status, hit, requestData];
}
