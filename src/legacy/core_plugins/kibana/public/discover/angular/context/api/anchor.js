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

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export function fetchAnchorProvider(indexPatterns, searchSource) {
  return async function fetchAnchor(
    indexPatternId,
    anchorId,
    sort
  ) {
    const indexPattern = await indexPatterns.get(indexPatternId);
    searchSource
      .setParent(undefined)
      .setField('index', indexPattern)
      .setField('version', true)
      .setField('size', 1)
      .setField('query', {
        query: {
          constant_score: {
            filter: {
              ids: {
                values: [anchorId],
              },
            },
          },
        },
        language: 'lucene',
      })
      .setField('sort', sort);

    const response = await searchSource.fetch();

    if (_.get(response, ['hits', 'total'], 0) < 1) {
      throw new Error(i18n.translate('kbn.context.failedToLoadAnchorDocumentErrorDescription', {
        defaultMessage: 'Failed to load anchor document.'
      }));
    }

    return {
      ..._.get(response, ['hits', 'hits', 0]),
      $$_isAnchor: true,
    };
  };
}
