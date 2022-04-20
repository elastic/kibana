/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ISearchSource, EsQuerySortValue } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { EsHitRecord } from '../../types';

export async function fetchAnchor(
  anchorId: string,
  indexPattern: DataView,
  searchSource: ISearchSource,
  sort: EsQuerySortValue[],
  useNewFieldsApi: boolean = false
): Promise<EsHitRecord> {
  updateSearchSource(searchSource, anchorId, sort, useNewFieldsApi, indexPattern);

  const response = await searchSource.fetch();
  const doc = response.hits?.hits?.[0];

  if (!doc) {
    throw new Error(
      i18n.translate('discover.context.failedToLoadAnchorDocumentErrorDescription', {
        defaultMessage: 'Failed to load anchor document.',
      })
    );
  }

  return {
    ...doc,
    isAnchor: true,
  } as EsHitRecord;
}

export function updateSearchSource(
  searchSource: ISearchSource,
  anchorId: string,
  sort: EsQuerySortValue[],
  useNewFieldsApi: boolean,
  indexPattern: DataView
) {
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
    .setField('sort', sort)
    .setField('trackTotalHits', false);
  if (useNewFieldsApi) {
    searchSource.removeField('fieldsFromSource');
    searchSource.setField('fields', [{ field: '*', include_unmapped: 'true' }]);
  }
  return searchSource;
}
