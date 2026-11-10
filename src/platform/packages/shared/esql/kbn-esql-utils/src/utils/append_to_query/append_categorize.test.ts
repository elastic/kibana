/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendCategorizeToESQLQuery } from './append_categorize';

const CATEGORIZE_PIPE =
  '\n| STATS Count = COUNT(*) BY Pattern = CATEGORIZE(message)\n| SORT Count DESC';

describe('appendCategorizeToESQLQuery', () => {
  it('appends the categorize pipeline to a source-only query', () => {
    expect(appendCategorizeToESQLQuery('FROM logs-*', 'message')).toBe(
      `FROM logs-*${CATEGORIZE_PIPE}`
    );
  });

  it('removes a trailing LIMIT so all matching documents are categorized', () => {
    expect(appendCategorizeToESQLQuery('FROM logs-* | LIMIT 1000', 'message')).toBe(
      `FROM logs-*${CATEGORIZE_PIPE}`
    );
  });

  it('removes all trailing LIMIT, SORT, KEEP and DROP commands', () => {
    expect(
      appendCategorizeToESQLQuery(
        'FROM logs-* | DROP host.ip | KEEP @timestamp, message | SORT @timestamp DESC | LIMIT 10',
        'message'
      )
    ).toBe(`FROM logs-*${CATEGORIZE_PIPE}`);
  });

  it('keeps preceding commands and their original formatting', () => {
    expect(
      appendCategorizeToESQLQuery(
        'FROM logs-*\n  | WHERE service.name == "checkout"\n  | EVAL x = 1\n  | LIMIT 1000',
        'message'
      )
    ).toBe(`FROM logs-*\n  | WHERE service.name == "checkout"\n  | EVAL x = 1${CATEGORIZE_PIPE}`);
  });

  it('keeps a LIMIT that is followed by a non-droppable command', () => {
    expect(appendCategorizeToESQLQuery('FROM logs-* | LIMIT 10 | WHERE x > 1', 'message')).toBe(
      `FROM logs-* | LIMIT 10 | WHERE x > 1${CATEGORIZE_PIPE}`
    );
  });

  it('appends on a new line when the query ends with a comment', () => {
    expect(appendCategorizeToESQLQuery('FROM logs-* // my comment', 'message')).toBe(
      `FROM logs-* // my comment${CATEGORIZE_PIPE}`
    );
  });

  it('keeps named parameters untouched', () => {
    expect(
      appendCategorizeToESQLQuery('FROM logs-* | WHERE host.name == ?host | LIMIT 10', 'message')
    ).toBe(`FROM logs-* | WHERE host.name == ?host${CATEGORIZE_PIPE}`);
  });

  it('escapes field names that need quoting', () => {
    expect(appendCategorizeToESQLQuery('FROM logs-*', 'log message')).toBe(
      'FROM logs-*\n| STATS Count = COUNT(*) BY Pattern = CATEGORIZE(`log message`)\n| SORT Count DESC'
    );
  });
});
