/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState, useMemo } from 'react';
import { IndexPattern, getServices } from '../../../kibana_services';
import { DocProps } from './doc';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../common';

export enum ElasticRequestState {
  Loading,
  NotFound,
  Found,
  Error,
  NotFoundIndexPattern,
}

/**
 * helper function to build a query body for Elasticsearch
 * https://www.elastic.co/guide/en/elasticsearch/reference/current//query-dsl-ids-query.html
 */
export function buildSearchBody(
  id: string,
  indexPattern: IndexPattern,
  useNewFieldsApi: boolean
): Record<string, any> {
  const computedFields = indexPattern.getComputedFields();

  return {
    query: {
      ids: {
        values: [id],
      },
    },
    stored_fields: computedFields.storedFields,
    _source: !useNewFieldsApi,
    fields: useNewFieldsApi ? [{ field: '*', include_unmapped: 'true' }] : undefined,
    script_fields: computedFields.scriptFields,
    docvalue_fields: computedFields.docvalueFields,
  };
}

/**
 * Custom react hook for querying a single doc in ElasticSearch
 */
export function useEsDocSearch({
  id,
  index,
  indexPatternId,
  indexPatternService,
}: DocProps): [ElasticRequestState, ElasticSearchHit | null, IndexPattern | null] {
  const [indexPattern, setIndexPattern] = useState<IndexPattern | null>(null);
  const [status, setStatus] = useState(ElasticRequestState.Loading);
  const [hit, setHit] = useState<ElasticSearchHit | null>(null);
  const { data, uiSettings } = useMemo(() => getServices(), []);
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  useEffect(() => {
    async function requestData() {
      try {
        const indexPatternEntity = await indexPatternService.get(indexPatternId);
        setIndexPattern(indexPatternEntity);

        const { rawResponse } = await data.search
          .search({
            params: {
              index,
              body: buildSearchBody(id, indexPatternEntity, useNewFieldsApi),
            },
          })
          .toPromise();

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
    }
    requestData();
  }, [id, index, indexPatternId, indexPatternService, data.search, useNewFieldsApi]);
  return [status, hit, indexPattern];
}
