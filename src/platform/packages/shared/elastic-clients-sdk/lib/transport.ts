/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transport, WeightedConnectionPool, UndiciConnection } from '@elastic/transport'
import type { ApiKeyAuth } from '@elastic/transport'
import { getResolvedConfig } from '../config/store'
import { clientHeaders } from './meta'

/** cached Transport instance -- created lazily on first call to `getTransport()` */
let _transport: Transport | undefined

/**
 * Returns a lazily-created, cached `Transport` instance configured from the
 * resolved config context's `elasticsearch` service block.
 *
 * The instance is created once per CLI invocation and reused for all subsequent
 * calls. Auth credentials are mapped from the config's `auth` field to the
 * appropriate transport auth type (`ApiKeyAuth` or `BasicAuth`).
 * appropriate transport auth type (`ApiKeyAuth` or `BasicAuth`).
 * @throws {Error} with code `missing_config` when no Elasticsearch service is configured
 */
export function getTransport (): Transport {
  if (_transport != null) return _transport

  const config = getResolvedConfig()
  const es = config?.context.elasticsearch

  if (es == null) {
    const err = new Error(
      'missing_config: No Elasticsearch connection configured in the active context. ' +
      'Add an elasticsearch block to your .elasticrc.yml config file.'
    )
    throw err
  }

  const { url, auth } = es

  let transportAuth: ApiKeyAuth | { username: string, password: string } | undefined
  if (auth != null && 'api_key' in auth && typeof (auth as Record<string, unknown>).api_key === 'string') {
    transportAuth = { apiKey: (auth as Record<string, unknown>).api_key as string }
  } else if (auth != null && 'username' in auth && 'password' in auth) {
    const a = auth as Record<string, unknown>
    if (typeof a.username === 'string' && typeof a.password === 'string') {
      transportAuth = { username: a.username, password: a.password }
    }
  }

  // WeightedConnectionPool is the simplest concrete pool available: BaseConnectionPool is
  // WeightedConnectionPool is the simplest concrete pool available: BaseConnectionPool is
  // abstract (getConnection throws), and ClusterConnectionPool adds dead-node tracking,
  // resurrection logic, and round-robin scheduling we don't need. With a single node,
  // WeightedConnectionPool noops its markAlive/markDead weight-adjustment paths and
  // resolves getConnection in one array scan -- effectively a direct connection lookup.
  //
  // auth must be passed in the constructor, not set afterwards: createConnection() bakes
  // auth into the connection's Authorization header at instantiation time via prepareHeaders().
  // Setting pool.auth after addConnection() has no effect on the already-created connection.
  const pool = new WeightedConnectionPool({
    Connection: UndiciConnection,
    ...(transportAuth != null && { auth: transportAuth })
  })
  pool.addConnection(url)

  _transport = new Transport({ connectionPool: pool, headers: clientHeaders() })
  return _transport
}

/**
 * Resets the cached Transport instance.
 *
 * @internal test seam -- call in `afterEach` to prevent instance reuse across tests
 */
export function _testResetTransport (): void {
  _transport = undefined
}
