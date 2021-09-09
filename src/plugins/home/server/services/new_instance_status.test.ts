/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNewInstance } from './new_instance_status';
import { elasticsearchServiceMock, savedObjectsClientMock } from '../../../../core/server/mocks';

describe('isNewInstance', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => jest.resetAllMocks());

  it('returns true when there are no index patterns', async () => {
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 100,
      total: 0,
      saved_objects: [],
    });
    expect(await isNewInstance({ esClient, soClient })).toEqual(true);
  });

  it('returns false when there are any index patterns other than metrics-* or logs-*', async () => {
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
    expect(await isNewInstance({ esClient, soClient })).toEqual(false);
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

    it('calls /_cat/indices for the index patterns', async () => {
      await isNewInstance({ esClient, soClient });
      expect(esClient.asCurrentUser.cat.indices).toHaveBeenCalledWith({
        index: 'logs-*,metrics-*',
        format: 'json',
      });
    });

    it('returns true if no logs or metrics indices exist', async () => {
      esClient.asCurrentUser.cat.indices.mockReturnValue(
        elasticsearchServiceMock.createSuccessTransportRequestPromise([])
      );
      expect(await isNewInstance({ esClient, soClient })).toEqual(true);
    });

    it('returns true if no logs or metrics indices contain data', async () => {
      esClient.asCurrentUser.cat.indices.mockReturnValue(
        elasticsearchServiceMock.createSuccessTransportRequestPromise([
          { index: '.ds-metrics-foo', 'docs.count': '0' },
        ])
      );
      expect(await isNewInstance({ esClient, soClient })).toEqual(true);
    });

    it('returns true if only metrics-elastic_agent index contains data', async () => {
      esClient.asCurrentUser.cat.indices.mockReturnValue(
        elasticsearchServiceMock.createSuccessTransportRequestPromise([
          { index: '.ds-metrics-elastic_agent', 'docs.count': '100' },
        ])
      );
      expect(await isNewInstance({ esClient, soClient })).toEqual(true);
    });

    it('returns true if only logs-elastic_agent index contains data', async () => {
      esClient.asCurrentUser.cat.indices.mockReturnValue(
        elasticsearchServiceMock.createSuccessTransportRequestPromise([
          { index: '.ds-logs-elastic_agent', 'docs.count': '100' },
        ])
      );
      expect(await isNewInstance({ esClient, soClient })).toEqual(true);
    });

    it('returns false if any other logs or metrics indices contain data', async () => {
      esClient.asCurrentUser.cat.indices.mockReturnValue(
        elasticsearchServiceMock.createSuccessTransportRequestPromise([
          { index: '.ds-metrics-foo', 'docs.count': '100' },
        ])
      );
      expect(await isNewInstance({ esClient, soClient })).toEqual(false);
    });

    it('returns false if an authentication error is thrown', async () => {
      esClient.asCurrentUser.cat.indices.mockReturnValue(
        elasticsearchServiceMock.createErrorTransportRequestPromise({})
      );
      expect(await isNewInstance({ esClient, soClient })).toEqual(false);
    });
  });
});
