/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { IndexPatternsApiServer } from './index_patterns_api_client';
import { IndexPatternsFetcher } from './fetcher';
import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  IUiSettingsClient,
} from '@kbn/core/server';
import { MappingRuntimeFieldType } from '@kbn/timelines-plugin/common/api/search_strategy';

jest.mock('./fetcher');

describe('IndexPatternsApiServer - getFieldsForWildcard', () => {
  let indexPatternsApiServer: IndexPatternsApiServer;
  let mockEsClient: ElasticsearchClient;
  let mockSavedObjectsClient: SavedObjectsClientContract;
  let mockUiSettingsClient: IUiSettingsClient;
  let getFieldsForWildcard: jest.Mock;

  beforeEach(() => {
    mockEsClient = {} as ElasticsearchClient;
    mockSavedObjectsClient = {} as SavedObjectsClientContract;
    mockUiSettingsClient = {} as IUiSettingsClient;

    getFieldsForWildcard = jest.fn().mockResolvedValue({
      fields: [{ name: 'field1', type: 'string' }],
      indices: ['index1'],
    });

    // Mock the constructor to return an object with the mocked method
    (IndexPatternsFetcher as jest.Mock).mockImplementation(() => ({
      getFieldsForWildcard,
    }));

    indexPatternsApiServer = new IndexPatternsApiServer(
      mockEsClient,
      mockSavedObjectsClient,
      mockUiSettingsClient,
      false // rollupsEnabled
    );
  });

  it('should propagate properties correctly to IndexPatternsFetcher.getFieldsForWildcard', async () => {
    const options = {
      allowNoIndex: true,
      pattern: 'test-pattern',
      metaFields: ['_id', '_type'],
      type: 'test-type',
      indexFilter: { term: { field: 'value' } },
      fields: ['field1', 'field2'],
      includeEmptyFields: false,
      abortSignal: new AbortController().signal,
      runtimeMappings: {
        runtime_field: {
          type: 'keyword' as MappingRuntimeFieldType,
          script: { source: 'emit("value")' },
        },
      },
      allowHidden: true,
      rollupIndex: undefined,
    };

    const result = await indexPatternsApiServer.getFieldsForWildcard(options);

    expect(IndexPatternsFetcher).toHaveBeenCalledWith(mockEsClient, {
      uiSettingsClient: mockUiSettingsClient,
      allowNoIndices: options.allowNoIndex,
      rollupsEnabled: false,
    });
    const { allowNoIndex, ...optionsWithoutAllowNoIndex } = options;
    expect(getFieldsForWildcard).toHaveBeenCalledWith(optionsWithoutAllowNoIndex);
    expect(result).toBe('mockedFields');
  });
});
