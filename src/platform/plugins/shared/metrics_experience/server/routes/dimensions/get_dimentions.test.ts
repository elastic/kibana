/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { getDimensions } from './get_dimentions';

describe('getDimensions', () => {
  let logger: Logger;
  let mockEsClient: TracedElasticsearchClient;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockEsClient = {
      esql: jest.fn(),
    } as unknown as TracedElasticsearchClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when dimensions array is empty', async () => {
    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: [],
      indices: ['metrics-*'],
      from: 1234567890,
      to: 1234567900,
      logger,
    });

    expect(result).toEqual([]);
    expect(mockEsClient.esql).not.toHaveBeenCalled();
  });

  it('should return empty array when dimensions is undefined', async () => {
    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: undefined as any,
      indices: ['metrics-*'],
      from: 1234567890,
      to: 1234567900,
      logger,
    });

    expect(result).toEqual([]);
    expect(mockEsClient.esql).not.toHaveBeenCalled();
  });

  it('should build correct ES|QL query with type casting to string', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [{ 'host.name': 'host1' }, { 'host.name': 'host2' }],
    });

    await getDimensions({
      esClient: mockEsClient,
      dimensions: ['host.name'],
      indices: ['metrics-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    expect(mockEsClient.esql).toHaveBeenCalledWith(
      'get_dimensions',
      {
        query: expect.stringContaining('TIMESERIES metrics-*'),
        filter: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    format: 'epoch_millis',
                    gte: 1234567890000,
                    lte: 1234567900000,
                  },
                },
              },
            ],
          },
        },
      },
      {
        transform: 'plain',
      }
    );

    // Verify the query contains type casting
    const calledQuery = (mockEsClient.esql as jest.Mock).mock.calls[0][1].query;
    expect(calledQuery).toContain('host.name = host.name::STRING');
    expect(calledQuery).toContain('WHERE host.name IS NOT NULL');
    expect(calledQuery).toContain('STATS BY host.name');
    expect(calledQuery).toContain('SORT host.name');
    expect(calledQuery).toContain('LIMIT 20');
  });

  it('should handle multiple indices', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [{ 'service.name': 'service1' }],
    });

    await getDimensions({
      esClient: mockEsClient,
      dimensions: ['service.name'],
      indices: ['metrics-a-*', 'metrics-b-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    const calledQuery = (mockEsClient.esql as jest.Mock).mock.calls[0][1].query;
    expect(calledQuery).toContain('TIMESERIES metrics-a-*, metrics-b-*');
  });

  it('should return formatted dimension values', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [{ 'host.name': 'host1' }, { 'host.name': 'host2' }, { 'host.name': 'host3' }],
    });

    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: ['host.name'],
      indices: ['metrics-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    expect(result).toEqual([
      { value: 'host1', field: 'host.name' },
      { value: 'host2', field: 'host.name' },
      { value: 'host3', field: 'host.name' },
    ]);
  });

  it('should handle numeric dimension values by converting to string', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [{ 'attributes.cpu': 0 }, { 'attributes.cpu': 1 }, { 'attributes.cpu': 2 }],
    });

    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: ['attributes.cpu'],
      indices: ['metrics-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    expect(result).toEqual([
      { value: '0', field: 'attributes.cpu' },
      { value: '1', field: 'attributes.cpu' },
      { value: '2', field: 'attributes.cpu' },
    ]);
  });

  it('should only process the first dimension when multiple dimensions provided', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [{ 'host.name': 'host1' }],
    });

    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: ['host.name', 'service.name', 'container.id'],
      indices: ['metrics-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    expect(result).toEqual([{ value: 'host1', field: 'host.name' }]);

    const calledQuery = (mockEsClient.esql as jest.Mock).mock.calls[0][1].query;
    expect(calledQuery).toContain('host.name');
    expect(calledQuery).not.toContain('service.name');
    expect(calledQuery).not.toContain('container.id');
  });

  it('should return empty array and log error when ES|QL query fails', async () => {
    const error = new Error('ES|QL query failed');
    (mockEsClient.esql as jest.Mock).mockRejectedValue(error);

    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: ['host.name'],
      indices: ['metrics-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith('Error fetching dimension values:', error);
  });

  it('should handle empty response from Elasticsearch', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [],
    });

    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: ['host.name'],
      indices: ['metrics-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    expect(result).toEqual([]);
  });

  it('should handle dimension fields with special characters', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [{ 'kubernetes.pod.name': 'pod-123' }],
    });

    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: ['kubernetes.pod.name'],
      indices: ['metrics-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    expect(result).toEqual([{ value: 'pod-123', field: 'kubernetes.pod.name' }]);
  });

  it('should apply correct time range filter', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [{ 'host.name': 'host1' }],
    });

    const from = 1609459200000;
    const to = 1609545600000;

    await getDimensions({
      esClient: mockEsClient,
      dimensions: ['host.name'],
      indices: ['metrics-*'],
      from,
      to,
      logger,
    });

    expect(mockEsClient.esql).toHaveBeenCalledWith(
      'get_dimensions',
      expect.objectContaining({
        filter: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    format: 'epoch_millis',
                    gte: from,
                    lte: to,
                  },
                },
              },
            ],
          },
        },
      }),
      expect.any(Object)
    );
  });

  it('should handle mixed type fields by casting to string', async () => {
    (mockEsClient.esql as jest.Mock).mockResolvedValue({
      hits: [
        { 'attributes.cpu': 'cpu0' }, // keyword type
        { 'attributes.cpu': '1' }, // long type cast to string
        { 'attributes.cpu': '2' }, // long type cast to string
      ],
    });

    const result = await getDimensions({
      esClient: mockEsClient,
      dimensions: ['attributes.cpu'],
      indices: ['metrics-generic.otel-*', 'metrics-hostmetricsreceiver.otel-*'],
      from: 1234567890000,
      to: 1234567900000,
      logger,
    });

    // Verify that the query includes type casting
    const calledQuery = (mockEsClient.esql as jest.Mock).mock.calls[0][1].query;
    expect(calledQuery).toContain('attributes.cpu = attributes.cpu::STRING');

    expect(result).toEqual([
      { value: 'cpu0', field: 'attributes.cpu' },
      { value: '1', field: 'attributes.cpu' },
      { value: '2', field: 'attributes.cpu' },
    ]);
  });
});
