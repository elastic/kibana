/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Copied from src/core/server/elasticsearch/legacy/api_types.ts including its deprecation mentioned below
 * TODO: Remove this and refactor the readPrivileges to utilize any newer client side ways rather than all this deprecated legacy stuff
 */
export interface LegacyCallAPIOptions {
  /**
   * Indicates whether `401 Unauthorized` errors returned from the Elasticsearch API
   * should be wrapped into `Boom` error instances with properly set `WWW-Authenticate`
   * header that could have been returned by the API itself. If API didn't specify that
   * then `Basic realm="Authorization Required"` is used as `WWW-Authenticate`.
   */
  wrap401Errors?: boolean;
  /**
   * A signal object that allows you to abort the request via an AbortController object.
   */
  signal?: AbortSignal;
}

type CallWithRequest<T extends Record<string, any>, V> = (
  endpoint: string,
  params: T,
  options?: LegacyCallAPIOptions
) => Promise<V>;

export const readPrivileges = async (
  callWithRequest: CallWithRequest<{}, unknown>,
  index: string
): Promise<unknown> => {
  return callWithRequest('transport.request', {
    path: '/_security/user/_has_privileges',
    method: 'POST',
    body: {
      cluster: [
        'all',
        'create_snapshot',
        'manage',
        'manage_api_key',
        'manage_ccr',
        'manage_transform',
        'manage_ilm',
        'manage_index_templates',
        'manage_ingest_pipelines',
        'manage_ml',
        'manage_own_api_key',
        'manage_pipeline',
        'manage_rollup',
        'manage_saml',
        'manage_security',
        'manage_token',
        'manage_watcher',
        'monitor',
        'monitor_transform',
        'monitor_ml',
        'monitor_rollup',
        'monitor_watcher',
        'read_ccr',
        'read_ilm',
        'transport_client',
      ],
      index: [
        {
          names: [index],
          privileges: [
            'all',
            'create',
            'create_doc',
            'create_index',
            'delete',
            'delete_index',
            'index',
            'manage',
            'maintenance',
            'manage_follow_index',
            'manage_ilm',
            'manage_leader_index',
            'monitor',
            'read',
            'read_cross_cluster',
            'view_index_metadata',
            'write',
          ],
        },
      ],
    },
  });
};
