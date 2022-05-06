/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import { errors as EsErrors } from '@elastic/elasticsearch';
jest.mock('./catch_retryable_es_client_errors');
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { initAction } from './initialize_action';

describe('initAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('calls catchRetryableEsClientErrors when the promise rejects', async () => {
    const retryableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 503,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      })
    );
    const client = elasticsearchClientMock.createInternalClient(
      elasticsearchClientMock.createErrorTransportRequestPromise(retryableError)
    );
    const task = initAction({ client, indices: ['my_index'] });
    try {
      await task();
    } catch (e) {
      /** ignore */
    }
    expect(catchRetryableEsClientErrors).toHaveBeenCalledWith(retryableError);
  });
  it('reproduce #131681', async () => {
    const clusterSettingsResponse = JSON.parse(
      `{"persistent":{"action.auto_create_index":"true","cluster.indices.close.enable":"false","cluster.metadata.display_name":"KWM-SECOPS-PROD","cluster.routing.allocation.disk.threshold_enabled":"true","cluster.routing.allocation.enable":"all","slm.retention_schedule":"0 20,50 * * * ?","xpack.ml.max_model_memory_limit":"315Mb","xpack.ml.use_auto_machine_memory_percent":"true","xpack.monitoring.collection.enabled":"true","xpack.monitoring.collection.interval":"10s","xpack.monitoring.exporters.__no-default-local__.enabled":"false","xpack.monitoring.exporters.__no-default-local__.type":"local","xpack.monitoring.exporters.found-user-defined.enabled":"true","xpack.monitoring.exporters.found-user-defined.headers.x-elastic-product-origin":"cloud","xpack.monitoring.exporters.found-user-defined.headers.x-found-cluster":"cda6150f224f466bba8b0c64c6161864","xpack.monitoring.exporters.found-user-defined.host":["http://containerhost:9244"],"xpack.monitoring.exporters.found-user-defined.type":"http"},"transient":{"action.auto_create_index":"true","cluster.indices.close.enable":"false","cluster.routing.allocation.disk.threshold_enabled":"true","cluster.routing.allocation.disk.watermark.high":"95%","cluster.routing.allocation.disk.watermark.low":"90%","cluster.routing.allocation.exclude._name":"no_instances_excluded","cluster.routing.allocation.node_concurrent_outgoing_recoveries":"4","indices.recovery.max_bytes_per_sec":"167Mb","indices.recovery.max_concurrent_file_chunks":"5","logger.org.elasticsearch.ingest.common.GrokProcessor":"debug"}}`
    );
    const client = elasticsearchClientMock.createInternalClient(
      new Promise((res) => res(clusterSettingsResponse))
    );
    const task = initAction({ client, indices: ['my_index'] });
    expect(task()).resolves.toMatchInlineSnapshot(`
      Object {
        "_tag": "Left",
        "left": Object {
          "message": "[unsupported_cluster_routing_allocation] The elasticsearch cluster has cluster routing allocation incorrectly set for migrations to continue.",
          "type": "unsupported_cluster_routing_allocation",
        },
      }
    `);
  });
});
