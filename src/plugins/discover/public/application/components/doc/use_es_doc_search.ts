/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { IndexPattern, getServices } from '../../../kibana_services';
import { DocProps } from './doc';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

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
export function buildSearchBody(id: string, indexPattern: IndexPattern): Record<string, any> {
  const computedFields = indexPattern.getComputedFields();

  return {
    query: {
      ids: {
        values: [id],
      },
    },
    stored_fields: computedFields.storedFields,
    _source: true,
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

  useEffect(() => {
    async function requestData() {
      try {
        const indexPatternEntity = await indexPatternService.get(indexPatternId);
        setIndexPattern(indexPatternEntity);

        const { rawResponse } = await getServices()
          .data.search.search({
            params: {
              index,
              body: buildSearchBody(id, indexPatternEntity),
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
  }, [id, index, indexPatternId, indexPatternService]);
  return [status, hit, indexPattern];
}
