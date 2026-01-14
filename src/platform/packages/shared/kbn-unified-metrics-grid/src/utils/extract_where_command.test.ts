/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractWhereCommand } from './extract_where_command';

describe('extractWhereCommand', () => {
  it('returns empty array for empty input', () => {
    expect(extractWhereCommand(undefined)).toEqual([]);
  });

  it('extracts WHERE after a source command', () => {
    const query = 'TS metrics-* | WHERE host.name == "host-01" AND system.cpu.user.pct IS NOT NULL';

    expect(extractWhereCommand(query)).toEqual([
      'host.name == "host-01" AND system.cpu.user.pct IS NOT NULL',
    ]);
  });

  it('extracts multiple top-level WHERE commands', () => {
    const query = 'FROM logs | WHERE x > 0 | WHERE y < 10';

    expect(extractWhereCommand(query)).toEqual(['x > 0', 'y < 10']);
  });

  it('extracts top-level WHERE commands even when not after source', () => {
    const query = 'FROM logs | EVAL x = 1 | WHERE x > 0';

    expect(extractWhereCommand(query)).toEqual(['x > 0']);
  });

  it('returns empty array for malformed ESQL', () => {
    expect(extractWhereCommand('FROM logs | WHERE')).toEqual([]);
  });
});
