/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { extractVersionFromKibanaIndexAliases, getIndexDetails } from './get_index_details';

describe('getIndexDetails', () => {
  it('calls getMapping and getAlias on the provided esClient', async () => {
    const client = elasticsearchClientMock.createInternalClient();
    client.indices.getMapping.mockResolvedValueOnce({ '.kibana_9.1.0_001': { mappings: {} } });
    client.indices.getAlias.mockResolvedValueOnce({ '.kibana_9.1.0_001': { aliases: {} } });

    await getIndexDetails(client, '.kibana');

    expect(client.indices.getMapping).toHaveBeenCalledTimes(1);
    expect(client.indices.getMapping).toHaveBeenCalledWith({ index: '.kibana' });
    expect(client.indices.getAlias).toHaveBeenCalledTimes(1);
    expect(client.indices.getAlias).toHaveBeenCalledWith({ index: '.kibana' });
  });

  it('throws an error if any of the calls fails miserably', () => {
    const client = elasticsearchClientMock.createInternalClient(
      Promise.reject('Something went really wrong!')
    );

    expect(getIndexDetails(client, '.kibana')).rejects.toEqual('Something went really wrong!');
  });

  it('throws a 404 error if the index is missing', () => {
    const client = elasticsearchClientMock.createInternalClient();
    // simulate an ElasticsearchClientError
    client.indices.getMapping.mockRejectedValueOnce({
      message: 'Not found',
      meta: { statusCode: 404 },
    });
    client.indices.getAlias.mockRejectedValueOnce({
      message: 'Not found',
      meta: { statusCode: 500 },
    });
    client.indices.getAlias.mockResolvedValueOnce({ '.kibana_9.1.0_001': { aliases: {} } });

    expect(getIndexDetails(client, '.kibana')).rejects.toEqual(
      expect.objectContaining({ meta: { statusCode: 404 } })
    );
  });

  it('processes and returns the results from both calls', async () => {
    const client = elasticsearchClientMock.createInternalClient();
    client.indices.getMapping.mockResolvedValueOnce({
      '.kibana_9.1.0_001': { mappings: { _meta: { foo: 'bar' } } },
    });
    client.indices.getAlias.mockResolvedValueOnce({
      '.kibana_9.1.0_001': {
        aliases: { '.kibana': { is_hidden: true }, '.kibana_9.1.0': { is_hidden: true } },
      },
    });

    const details = await getIndexDetails(client, '.kibana');

    expect(details.mappings).toEqual({ _meta: { foo: 'bar' } });
    expect(details.aliases).toEqual(['.kibana', '.kibana_9.1.0']);
  });
});

describe('extractVersionFromKibanaIndexAliases', () => {
  it(`returns undefined if there aren't any aliases`, () => {
    expect(extractVersionFromKibanaIndexAliases([])).toBeUndefined();
  });

  it(`returns undefined if there aren't any version aliases`, () => {
    expect(extractVersionFromKibanaIndexAliases(['.kibana', '.kibana_1'])).toBeUndefined();
  });

  it(`returns the version of the version alias`, () => {
    expect(extractVersionFromKibanaIndexAliases(['.kibana', '.kibana_8.8.0'])).toEqual('8.8.0');
  });

  it(`returns the latest version of the version aliases, if there is more than one`, () => {
    expect(
      extractVersionFromKibanaIndexAliases([
        '.kibana',
        '.kibana_8.8.0',
        '.kibana_8.18.0',
        '.kibana_8.9.0',
      ])
    ).toEqual('8.18.0');
  });

  it(`can handle SO indices with underscores in their names`, () => {
    expect(
      extractVersionFromKibanaIndexAliases(['.kibana_task_manager', '.kibana_task_manager_8.18.0'])
    ).toEqual('8.18.0');
  });
});
