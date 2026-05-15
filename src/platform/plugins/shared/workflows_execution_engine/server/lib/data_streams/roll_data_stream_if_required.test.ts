/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD } from './constants';
import { rollDataStreamIfRequired } from './roll_data_stream_if_required';
import { WORKFLOWS_EXECUTION_LOGS_DATA_STREAM } from '../../repositories/logs_repository/constants';
import { WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION } from '../../repositories/logs_repository/data_stream';

const DATA_STREAM_NAME = WORKFLOWS_EXECUTION_LOGS_DATA_STREAM;
const TARGET_VERSION = WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION;

describe('rollDataStreamIfRequired', () => {
  const mockLogger = loggingSystemMock.createLogger();
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const msgPrefix = `Data stream ${DATA_STREAM_NAME}`;
  const skipMessage = 'does not need to be rolled over';
  const scheduleMessage = 'scheduling lazy rollover';

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  const rollParams = () => ({
    logger: mockLogger,
    esClient: mockEsClient,
    dataStreamName: DATA_STREAM_NAME,
    targetManagedIndexMappingsVersion: TARGET_VERSION,
  });

  it('does nothing if there is no data stream', async () => {
    mockEsClient.indices.exists.mockResponse(false);

    await rollDataStreamIfRequired(rollParams());

    expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
      index: DATA_STREAM_NAME,
      expand_wildcards: 'all',
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(`${msgPrefix} does not exist so ${skipMessage}`);
    expect(mockEsClient.indices.getMapping).not.toHaveBeenCalled();
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('does nothing if there are no mappings on the backing indices', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    mockEsClient.indices.getMapping.mockResponse({});

    await rollDataStreamIfRequired(rollParams());

    expect(mockLogger.debug).toHaveBeenCalledWith(
      `${msgPrefix} has no backing indices so ${skipMessage}`
    );
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('rolls over if backing indices have no managed_index_mappings_version', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: { _meta: {} },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);

    await rollDataStreamIfRequired(rollParams());

    expect(mockLogger.info).toHaveBeenCalledWith(
      `${msgPrefix} has no ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD} on backing indices; ${scheduleMessage}`
    );
    expect(mockEsClient.indices.rollover).toHaveBeenCalledWith({
      alias: DATA_STREAM_NAME,
      lazy: true,
    });
  });

  it('rolls over if deployed version is older than the Kibana target', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    const olderVersion = TARGET_VERSION - 1;
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: {
          _meta: { [MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD]: olderVersion },
        },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);

    await rollDataStreamIfRequired(rollParams());

    expect(mockLogger.info).toHaveBeenCalledWith(
      `${msgPrefix} has ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD} ${olderVersion}, target is ${TARGET_VERSION}; ${scheduleMessage}`
    );
    expect(mockEsClient.indices.rollover).toHaveBeenCalled();
  });

  it('throws if deployed version is newer than the Kibana target', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    const newerVersion = TARGET_VERSION + 1;
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: {
          _meta: { [MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD]: newerVersion },
        },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);

    await expect(rollDataStreamIfRequired(rollParams())).rejects.toThrow(
      `${msgPrefix} has ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD} ${newerVersion} which is newer than Kibana target ${TARGET_VERSION}`
    );

    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('does nothing if deployed version matches the Kibana target', async () => {
    mockEsClient.indices.exists.mockResponse(true);
    const mappings: IndicesGetMappingResponse = {
      indexName: {
        mappings: {
          _meta: { [MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD]: TARGET_VERSION },
        },
      },
    };
    mockEsClient.indices.getMapping.mockResponse(mappings);

    await rollDataStreamIfRequired(rollParams());

    expect(mockLogger.debug).toHaveBeenCalledWith(
      `${msgPrefix} has latest mappings applied so ${skipMessage}`
    );
    expect(mockEsClient.indices.rollover).not.toHaveBeenCalled();
  });
});
