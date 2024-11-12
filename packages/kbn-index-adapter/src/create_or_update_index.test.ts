/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { updateIndices, createIndex, createOrUpdateIndex } from './create_or_update_index';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

esClient.indices.putMapping.mockResolvedValue({ acknowledged: true });
esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });

const simulateIndexTemplateResponse = { template: { mappings: {}, settings: {}, aliases: {} } };
esClient.indices.simulateIndexTemplate.mockResolvedValue(simulateIndexTemplateResponse);

const name = 'test_index_name';
const totalFieldsLimit = 1000;

describe('updateIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should update indices`, async () => {
    const indexName = 'test_index_name-default';
    esClient.indices.get.mockResolvedValueOnce({ [indexName]: {} });

    await updateIndices({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.get).toHaveBeenCalledWith({
      index: name,
      expand_wildcards: 'all',
    });

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: indexName,
      body: { 'index.mapping.total_fields.limit': totalFieldsLimit },
    });
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: indexName,
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: indexName,
      body: simulateIndexTemplateResponse.template.mappings,
    });
  });

  it(`should update multiple indices`, async () => {
    const indexName1 = 'test_index_name-1';
    const indexName2 = 'test_index_name-2';
    esClient.indices.get.mockResolvedValueOnce({ [indexName1]: {}, [indexName2]: {} });

    await updateIndices({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.putSettings).toHaveBeenCalledTimes(2);
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });

  it(`should not update indices when not exist`, async () => {
    esClient.indices.get.mockResolvedValueOnce({});

    await updateIndices({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.putSettings).not.toHaveBeenCalled();
    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });
});

describe('createIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should create index`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(false);

    await createIndex({
      esClient,
      logger,
      name,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: name, expand_wildcards: 'all' });
    expect(esClient.indices.create).toHaveBeenCalledWith({ index: name });
  });

  it(`should not create index if already exists`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(true);

    await createIndex({
      esClient,
      logger,
      name,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: name, expand_wildcards: 'all' });
    expect(esClient.indices.create).not.toHaveBeenCalled();
  });
});

describe('createOrUpdateIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should create index if not exists`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(false);

    await createOrUpdateIndex({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.create).toHaveBeenCalledWith({ index: name });
  });

  it(`should update index if already exists`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(true);

    await createOrUpdateIndex({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: name, expand_wildcards: 'all' });

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: name,
      body: { 'index.mapping.total_fields.limit': totalFieldsLimit },
    });
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name,
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: name,
      body: simulateIndexTemplateResponse.template.mappings,
    });
  });
});
