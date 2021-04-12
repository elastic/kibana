/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export function fetchAnchorProvider(indexPatterns, searchSource, useNewFieldsApi = false) {
  return async function fetchAnchor(indexPatternId, anchorId, sort) {
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
    if (useNewFieldsApi) {
      searchSource.removeField('fieldsFromSource');
      searchSource.setField('fields', [{ field: '*', include_unmapped: 'true' }]);
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
