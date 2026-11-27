/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatEsqlSources } from './format_esql_sources';

describe('formatEsqlSources', () => {
  it('writes every source of the index pattern', () => {
    expect(formatEsqlSources('logs-*,metrics-*')).toBe('logs-*, metrics-*');
    expect(formatEsqlSources('my-view')).toBe('my-view');
  });

  it('quotes the source of a remote cluster and the one with a selector, as the editor does', () => {
    expect(formatEsqlSources('remote:logs-*')).toBe('"remote:logs-*"');
    expect(formatEsqlSources('logs-*::data')).toBe('"logs-*::data"');
  });

  it('quotes a source that cannot be written without quotes', () => {
    expect(formatEsqlSources('logs=archive')).toBe('"logs=archive"');
    expect(formatEsqlSources('<logs-{now/d}>,other-*')).toBe('"<logs-{now/d}>", other-*');
    expect(formatEsqlSources('my index')).toBe('"my index"');
  });

  it('escapes the quotes and backslashes of a quoted source', () => {
    expect(formatEsqlSources('a"b\\c=d')).toBe('"a\\"b\\\\c=d"');
  });
});
