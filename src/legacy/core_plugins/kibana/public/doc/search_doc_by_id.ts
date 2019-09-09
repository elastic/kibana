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
import { ElasticSearchHit } from 'ui/registry/doc_views_types';

export async function searchDocById(
  id: string,
  index: string,
  es: any,
  indexPattern: any
): Promise<{
  status: string;
  hit?: ElasticSearchHit;
}> {
  const computedFields = indexPattern.getComputedFields();

  try {
    const esResult = await es.search({
      index,
      body: {
        query: {
          ids: {
            values: [id],
          },
        },
        stored_fields: computedFields.storedFields,
        _source: true,
        script_fields: computedFields.scriptFields,
        docvalue_fields: computedFields.docvalueFields,
      },
    });

    if (!esResult.hits || esResult.hits.total < 1) {
      return {
        status: 'notFound',
      };
    }
    return {
      status: 'found',
      hit: esResult.hits.hits[0],
    };
  } catch (err) {
    return {
      status: err.status === 404 ? 'notFound' : 'error',
    };
  }
}
