/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaClient } from '@elastic/elasticsearch/lib/api/kibana';
import type {
  Client,
  TransportRequestParams,
  TransportRequestOptions,
  TransportResult,
} from '@elastic/elasticsearch';
import { Transport } from '@elastic/elasticsearch';

// remove once https://github.com/elastic/kibana/issues/116095 is addressed
class KibanaTransport extends Transport {
  request(params: TransportRequestParams, options?: TransportRequestOptions) {
    const opts: TransportRequestOptions = options || {};
    // Enforce the client to return TransportResult.
    // It's required for bwc with responses in 7.x version.
    if (opts?.meta === undefined) {
      opts.meta = true;
    }
    return super.request(params, opts) as Promise<TransportResult<any, any>>;
  }
}

export function convertToKibanaClient(esClient: Client): KibanaClient {
  // @ts-expect-error @elastic/elasticsearch fix discrepancy between clients
  return esClient.child({
    Transport: KibanaTransport,
  });
}
