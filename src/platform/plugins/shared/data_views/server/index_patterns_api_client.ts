/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  IUiSettingsClient,
} from '@kbn/core/server';
import { GetFieldsOptions, IDataViewsApiClient } from '../common/types';
import { DataViewMissingIndices } from '../common/lib';
import { IndexPatternsFetcher } from './fetcher';
import { hasUserDataView } from './has_user_data_view';

export class IndexPatternsApiServer implements IDataViewsApiClient {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly uiSettingsClient: IUiSettingsClient,
    private readonly rollupsEnabled: boolean
  ) {}
  async getFieldsForWildcard({
    pattern,
    metaFields,
    type,
    rollupIndex,
    allowNoIndex,
    indexFilter,
    fields,
    includeEmptyFields,
  }: GetFieldsOptions) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient, {
      uiSettingsClient: this.uiSettingsClient,
      allowNoIndices: allowNoIndex,
      rollupsEnabled: this.rollupsEnabled,
    });
    return await indexPatterns
      .getFieldsForWildcard({
        pattern,
        metaFields,
        type,
        rollupIndex,
        indexFilter,
        fields,
        includeEmptyFields,
      })
      .catch((err) => {
        if (
          err.output.payload.statusCode === 404 &&
          err.output.payload.code === 'no_matching_indices'
        ) {
          throw new DataViewMissingIndices(pattern);
        } else {
          throw err;
        }
      });
  }

  /**
   * Is there a user created data view?
   */
  async hasUserDataView() {
    return hasUserDataView({
      esClient: this.esClient,
      soClient: this.savedObjectsClient,
    });
  }
}
