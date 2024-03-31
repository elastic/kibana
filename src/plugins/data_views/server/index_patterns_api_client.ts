/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { castArray } from 'lodash';
import { GetFieldsOptions, IDataViewsApiClient } from '../common/types';
import { DataViewMissingIndices } from '../common/lib';
import { IndexPatternsFetcher } from './fetcher';
import { hasUserDataView } from './has_user_data_view';

export class IndexPatternsApiServer implements IDataViewsApiClient {
  esClient: ElasticsearchClient;
  constructor(
    elasticsearchClient: ElasticsearchClient,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly rollupsEnabled: boolean
  ) {
    this.esClient = elasticsearchClient;
  }
  async getFieldsForWildcard({
    pattern,
    metaFields,
    type,
    rollupIndex,
    allowNoIndex,
    indexFilter,
    fields,
  }: GetFieldsOptions) {
    const indexPatterns = new IndexPatternsFetcher(
      this.esClient,
      allowNoIndex,
      this.rollupsEnabled
    );
    return await indexPatterns
      .getFieldsForWildcard({
        pattern,
        metaFields,
        type,
        rollupIndex,
        indexFilter,
        fields,
      })
      .catch((err) => {
        if (
          err.output.payload.statusCode === 404 &&
          err.output.payload.code === 'no_matching_indices'
        ) {
          throw new DataViewMissingIndices(castArray(pattern).join(','));
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
