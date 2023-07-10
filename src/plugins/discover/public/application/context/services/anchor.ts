/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { ISearchSource, EsQuerySortValue } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type {
  DataTableRecord,
  EsHitRecord,
  SearchResponseInterceptedWarning,
} from '../../../types';
import { buildDataTableRecord } from '../../../utils/build_data_record';
import type { DiscoverServices } from '../../../build_services';
import { DISABLE_SHARD_FAILURE_WARNING } from '../../../../common/constants';
import { getSearchResponseInterceptedWarnings } from '../../../utils/get_search_response_intercepted_warnings';

export async function fetchAnchor(
  anchorId: string,
  dataView: DataView,
  searchSource: ISearchSource,
  sort: EsQuerySortValue[],
  useNewFieldsApi: boolean = false,
  services: DiscoverServices
): Promise<{
  anchorRow: DataTableRecord;
  interceptedWarnings: SearchResponseInterceptedWarning[] | undefined;
}> {
  updateSearchSource(searchSource, anchorId, sort, useNewFieldsApi, dataView);

  const inspectorAdapters = { requests: new RequestAdapter() };
  const { rawResponse } = await lastValueFrom(
    searchSource.fetch$({
      disableShardFailureWarning: DISABLE_SHARD_FAILURE_WARNING,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: 'anchor',
      },
    })
  );
  const doc = rawResponse.hits?.hits?.[0] as EsHitRecord;

  if (!doc) {
    throw new Error(
      i18n.translate('discover.context.failedToLoadAnchorDocumentErrorDescription', {
        defaultMessage: 'Failed to load anchor document.',
      })
    );
  }
  return {
    anchorRow: buildDataTableRecord(doc, dataView, true),
    interceptedWarnings: getSearchResponseInterceptedWarnings({
      services,
      adapter: inspectorAdapters.requests,
      options: {
        disableShardFailureWarning: DISABLE_SHARD_FAILURE_WARNING,
      },
    }),
  };
}

export function updateSearchSource(
  searchSource: ISearchSource,
  anchorId: string,
  sort: EsQuerySortValue[],
  useNewFieldsApi: boolean,
  dataView: DataView
) {
  searchSource
    .setParent(undefined)
    .setField('index', dataView)
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
