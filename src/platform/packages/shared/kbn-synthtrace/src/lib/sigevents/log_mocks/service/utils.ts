/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Runtime } from '../../types';

export interface OutboundTemplate {
  level: 'info' | 'error';
  template: string;
}
export type ProtocolData = Partial<
  Record<Runtime, [init: string, okResult: string, errorResult: string]>
>;
export function makeProtocol(data: ProtocolData): {
  ok: Partial<Record<Runtime, OutboundTemplate[]>>;
  error: Partial<Record<Runtime, OutboundTemplate[]>>;
} {
  const entries = Object.entries(data) as Array<[Runtime, [string, string, string]]>;
  return {
    ok: Object.fromEntries(
      entries.map(([rt, [init, ok]]) => [
        rt,
        [
          { level: 'info' as const, template: init },
          { level: 'info' as const, template: ok },
        ],
      ])
    ),
    error: Object.fromEntries(
      entries.map(([rt, [init, , err]]) => [
        rt,
        [
          { level: 'info' as const, template: init },
          { level: 'error' as const, template: err },
        ],
      ])
    ),
  };
}
