/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  updateDataStreams,
  createDataStream,
  createOrUpdateDataStream,
} from './create_or_update_data_stream';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

esClient.indices.putMapping.mockResolvedValue({ acknowledged: true });
esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });

const simulateIndexTemplateResponse = { template: { mappings: { is_managed: true } } };
esClient.indices.simulateIndexTemplate.mockResolvedValue(simulateIndexTemplateResponse);

const name = 'test_data_stream';
const totalFieldsLimit = 1000;

describe('updateDataStreams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should update data streams`, async () => {
    const dataStreamName = 'test_data_stream-default';
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [{ name: dataStreamName } as IndicesDataStream],
    });

    await updateDataStreams({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.getDataStream).toHaveBeenCalledWith({ name, expand_wildcards: 'all' });

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: dataStreamName,
      body: { 'index.mapping.total_fields.limit': totalFieldsLimit },
    });
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: dataStreamName,
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: dataStreamName,
      body: simulateIndexTemplateResponse.template.mappings,
    });
  });

  it(`should update multiple data streams`, async () => {
    const dataStreamName1 = 'test_data_stream-1';
    const dataStreamName2 = 'test_data_stream-2';
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [{ name: dataStreamName1 }, { name: dataStreamName2 }] as IndicesDataStream[],
    });

    await updateDataStreams({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.putSettings).toHaveBeenCalledTimes(2);
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });

  it(`should not update data streams when not exist`, async () => {
    esClient.indices.getDataStream.mockResolvedValueOnce({ data_streams: [] });

    await updateDataStreams({
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

describe('createDataStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should create data stream`, async () => {
    esClient.indices.getDataStream.mockResolvedValueOnce({ data_streams: [] });

    await createDataStream({
      esClient,
      logger,
      name,
    });

    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({ name });
  });

  it(`should not create data stream if already exists`, async () => {
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [{ name: 'test_data_stream-default' } as IndicesDataStream],
    });

    await createDataStream({
      esClient,
      logger,
      name,
    });

    expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
  });
});

describe('createOrUpdateDataStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should create data stream if not exists`, async () => {
    esClient.indices.getDataStream.mockResolvedValueOnce({ data_streams: [] });

    await createDataStream({
      esClient,
      logger,
      name,
    });

    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({ name });
  });

  it(`should update data stream if already exists`, async () => {
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [{ name: 'test_data_stream-default' } as IndicesDataStream],
    });

    await createOrUpdateDataStream({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.getDataStream).toHaveBeenCalledWith({ name, expand_wildcards: 'all' });

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
