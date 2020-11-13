/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
