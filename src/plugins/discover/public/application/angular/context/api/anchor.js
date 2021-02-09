/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export function fetchAnchorProvider(
  indexPatterns,
  searchSource,
  timefilter,
  useNewFieldsApi = false
) {
  return async function fetchAnchor(props) {
    const { indexPatternId, anchorId, sort, documentTime, routing } = props;
    const indexPattern = await indexPatterns.get(indexPatternId);

    const filters = [{ ids: { values: [anchorId] } }];
    if (documentTime) {
      // Use the time filter if available to improve performance. This is not always available
      // because in previous versions of Discover the URL was missing time
      filters.push(
        timefilter.createFilter(indexPattern, {
          from: documentTime,
          to: documentTime,
        })
      );
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

    if (useNewFieldsApi) {
      searchSource.removeField('fieldsFromSource');
      searchSource.setField('fields', ['*']);
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
