/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateQueryTarget } from './validate_query_target';

describe('validateQueryTarget', () => {
  it('accepts a query that reads the target verbatim', () => {
    expect(
      validateQueryTarget({
        query: 'FROM logs*,-logstash*,filebeat-* | STATS count = COUNT(*)',
        target: 'logs*,-logstash*,filebeat-*',
      })
    ).toBeUndefined();
  });

  it('accepts a quoted source and a subset of the target', () => {
    expect(
      validateQueryTarget({ query: 'FROM "logs-*" | LIMIT 10', target: 'logs-*,metrics-*' })
    ).toBeUndefined();
  });

  it('rejects a source outside the target (EX-8)', () => {
    const error = validateQueryTarget({ query: 'FROM logz-* | LIMIT 10', target: 'logs-*' });
    expect(error).toContain('"logz-*"');
    expect(error).toContain('exactly "logs-*"');
  });

  it('rejects a query that drops an exclusion', () => {
    const error = validateQueryTarget({
      query: 'FROM logs*,filebeat-* | LIMIT 10',
      target: 'logs*,-logstash*,filebeat-*',
    });
    expect(error).toContain('drops the exclusion "-logstash*"');
  });

  it('keeps a cluster prefix as part of the source name', () => {
    expect(
      validateQueryTarget({ query: 'FROM logs-* | LIMIT 1', target: 'remote:logs-*' })
    ).toContain('"logs-*"');
    expect(
      validateQueryTarget({ query: 'FROM remote:logs-* | LIMIT 1', target: 'remote:logs-*' })
    ).toBeUndefined();
  });

  it('ignores sourceless queries', () => {
    expect(validateQueryTarget({ query: 'ROW a = 1', target: 'logs-*' })).toBeUndefined();
  });

  it('rejects a changed source command when one is pinned (EX-8)', () => {
    const error = validateQueryTarget({
      query: 'FROM metrics-* | STATS max = MAX(cpu)',
      target: 'metrics-*',
      sourceCommand: 'TS',
    });
    expect(error).toContain('starts with FROM');
    expect(error).toContain('TS source command');
  });

  it('accepts the pinned source command', () => {
    expect(
      validateQueryTarget({
        query: 'TS metrics-* | STATS max = MAX(cpu)',
        target: 'metrics-*',
        sourceCommand: 'TS',
      })
    ).toBeUndefined();
  });

  it('rejects a dropped project routing when one is pinned', () => {
    const error = validateQueryTarget({
      query: 'FROM logs-* | LIMIT 10',
      target: 'logs-*',
      projectRouting: '_alias:*',
    });
    expect(error).toContain('SET project_routing = "_alias:*"');
  });

  it('accepts a kept project routing', () => {
    expect(
      validateQueryTarget({
        query: 'SET project_routing = "_alias:*"; FROM logs-* | LIMIT 10',
        target: 'logs-*',
        projectRouting: '_alias:*',
      })
    ).toBeUndefined();
  });
});
