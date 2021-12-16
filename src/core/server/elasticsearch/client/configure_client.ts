/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, Transport } from '@elastic/elasticsearch';

import type {
  TransportRequestParams,
  TransportRequestOptions,
} from '@elastic/elasticsearch/lib/Transport';
import { Logger } from '../../logging';
import { parseClientOptions, ElasticsearchClientConfig } from './client_config';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';

const noop = () => undefined;

export const configureClient = (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    getExecutionContext = noop,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
  }
): Client => {
  const clientOptions = parseClientOptions(config, scoped);
  class KibanaTransport extends Transport {
    request(params: TransportRequestParams, options?: TransportRequestOptions) {
      const opts = options || {};
      const opaqueId = getExecutionContext();
      if (opaqueId && !opts.opaqueId) {
        // rewrites headers['x-opaque-id'] if it presents
        opts.opaqueId = opaqueId;
      }
      return super.request(params, opts);
    }
  }

  const client = new Client({ ...clientOptions, Transport: KibanaTransport });

  // --------------------------------------------------------------------------------- //
  // Hack to disable the "Product check" only in the scoped clients while we           //
  // come up with a better approach in https://github.com/elastic/kibana/issues/110675 //
  if (scoped) skipProductCheck(client);
  // --------------------------------------------------------------------------------- //

  instrumentEsQueryAndDeprecationLogger({ logger, client, type });

  return client;
};

/**
 * Hack to skip the Product Check performed by the Elasticsearch-js client.
 * We noticed that the scoped clients are always performing this check because
 * of the way we initialize the clients. We'll discuss changing this in the issue
 * https://github.com/elastic/kibana/issues/110675. In the meanwhile, let's skip
 * it for the scoped clients.
 *
 * The hack is copied from the test/utils in the elasticsearch-js repo
 * (https://github.com/elastic/elasticsearch-js/blob/master/test/utils/index.js#L45-L56)
 */
function skipProductCheck(client: Client) {
  const tSymbol = Object.getOwnPropertySymbols(client.transport || client).filter(
    (symbol) => symbol.description === 'product check'
  )[0];
  // @ts-expect-error `tSymbol` is missing in the index signature of Transport
  (client.transport || client)[tSymbol] = 2;
}
