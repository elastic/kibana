/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ClientTypeSpec } from './client_type_spec';

/** Minimal pool handle returned by mysql_client_type.build(). PoC stub. */
export interface MysqlPool {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  end(): Promise<void>;
}

export const mysqlClientType: ClientTypeSpec<MysqlPool> = {
  id: 'mysql',

  async build() {
    throw new Error('mysql_client_type: not yet implemented');
  },

  async terminate(client) {
    await client.end();
  },
};
