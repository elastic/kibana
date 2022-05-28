/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hasUserIndexPattern } from './has_user_index_pattern';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

describe('hasUserIndexPattern', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => jest.resetAllMocks());

  it('returns false when there are no index patterns', async () => {
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 100,
      total: 0,
      saved_objects: [],
    });
    expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(false);
  });

  it('returns true when there are any index patterns other than metrics-* or logs-*', async () => {
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 100,
      total: 1,
      saved_objects: [
        {
          id: '1',
          references: [],
          type: 'index-pattern',
          score: 99,
          attributes: { title: 'my-pattern-*' },
        },
      ],
    });
    expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(true);
  });

  describe('when only metrics-* and logs-* index patterns exist', () => {
    beforeEach(() => {
      soClient.find.mockResolvedValue({
        page: 1,
        per_page: 100,
        total: 2,
        saved_objects: [
          {
            id: '1',
            references: [],
            type: 'index-pattern',
            score: 99,
            attributes: { title: 'metrics-*' },
          },
          {
            id: '2',
            references: [],
            type: 'index-pattern',
            score: 99,
            attributes: { title: 'logs-*' },
          },
        ],
      });
    });

    it('calls indices.resolveIndex for the index patterns', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        data_streams: [],
        aliases: [],
      });
      await hasUserIndexPattern({ esClient, soClient });
      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
        name: 'logs-*,metrics-*',
      });
    });

    it('returns false if no logs or metrics data_streams exist', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        data_streams: [],
        aliases: [],
      });
      expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(false);
    });

    it('returns true if any index exists', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'logs', attributes: [] }],
        data_streams: [],
        aliases: [],
      });
      expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(true);
    });

    it('returns false if only metrics-elastic_agent data stream exists', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        data_streams: [
          {
            name: 'metrics-elastic_agent',
            timestamp_field: '@timestamp',
            backing_indices: ['.ds-metrics-elastic_agent'],
          },
        ],
        aliases: [],
      });
      expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(false);
    });

    it('returns false if only logs-elastic_agent data stream exists', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        data_streams: [
          {
            name: 'logs-elastic_agent',
            timestamp_field: '@timestamp',
            backing_indices: ['.ds-logs-elastic_agent'],
          },
        ],
        aliases: [],
      });
      expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(false);
    });

    it('returns false if only logs-enterprise_search.api-default data stream exists', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        data_streams: [
          {
            name: 'logs-enterprise_search.api-default',
            timestamp_field: '@timestamp',
            backing_indices: ['.ds-logs-enterprise_search.api-default-2022.03.07-000001'],
          },
        ],
        aliases: [],
      });
      expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(false);
    });

    it('returns false if only metrics-endpoint.metadata_current_default index exists', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [
          {
            name: 'metrics-endpoint.metadata_current_default',
            attributes: ['open'],
          },
        ],
        aliases: [],
        data_streams: [],
      });
      expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(false);
    });

    it('returns true if any other data stream exists', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        data_streams: [
          {
            name: 'other',
            timestamp_field: '@timestamp',
            backing_indices: ['.ds-other'],
          },
        ],
        aliases: [],
      });
      expect(await hasUserIndexPattern({ esClient, soClient })).toEqual(true);
    });
  });
});
