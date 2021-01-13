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

export function fetchAnchorProvider(indexPatterns, searchSource, timefilter) {
  return async function fetchAnchor(props) {
    const { indexPatternId, anchorId, sort, timeRange, routing } = props;
    const indexPattern = await indexPatterns.get(indexPatternId);

    const filters = [{ ids: { values: [anchorId] } }];
    if (timeRange) {
      // Use the time filter if available to improve performance. This is not always available
      // because in previous versions of Discover the URL was missing time
      filters.push(timefilter.createFilter(indexPattern, timeRange));
    }

    searchSource
      .setParent(undefined)
      .setField('index', indexPattern)
      .setField('version', true)
      .setField('size', 1)
      .setField('filter', filters)
      .setField('sort', sort);

    if (routing) {
      // If the document is assigned to a specific shard we can query it directly
      searchSource.setField('routing', routing);
    }

    const response = await searchSource.fetch();

    if (_.get(response, ['hits', 'total'], 0) < 1) {
      throw new Error(
        i18n.translate('discover.context.failedToLoadAnchorDocumentErrorDescription', {
          defaultMessage: 'Failed to load anchor document.',
        })
      );
    }

    return {
      ..._.get(response, ['hits', 'hits', 0]),
      $$_isAnchor: true,
    };
  };
}
