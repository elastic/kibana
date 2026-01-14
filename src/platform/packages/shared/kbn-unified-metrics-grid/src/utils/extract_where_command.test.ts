/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@kbn/es-query';
import { extractWhereCommand } from './extract_where_command';

describe('extractWhereCommand', () => {
  it('returns empty array for non-aggregate queries', () => {
    const query: Query = { query: 'host.name: "host-01"', language: 'kuery' };
    expect(extractWhereCommand(query)).toEqual([]);
  });

  it('extracts WHERE after a source command', () => {
    const query = {
      esql: 'TS metrics-* | WHERE host.name == "host-01" AND system.cpu.user.pct IS NOT NULL',
    };

    expect(extractWhereCommand(query)).toEqual([
      'host.name == "host-01" AND system.cpu.user.pct IS NOT NULL',
    ]);
  });

  it('extracts top-level WHERE commands even when not after source', () => {
    const query = {
      esql: 'FROM logs | EVAL x = 1 | WHERE x > 0',
    };

    expect(extractWhereCommand(query)).toEqual(['x > 0']);
  });
});
