/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { SearchCursor } from './search_cursor';

class TestSearchCursor extends SearchCursor {
  public async initialize() {}

  public async getPage() {
    return undefined;
  }

  public updateIdFromResults() {}

  public async closeCursor() {}

  public getUnableToCloseCursorMessage() {
    return '';
  }

  public logResults() {
    this.logSearchResults({}, {
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        total: { value: 0, relation: 'eq' },
        max_score: null,
        hits: [],
      },
    } as estypes.SearchResponse<unknown>);
  }
}

describe('SearchCursor', () => {
  it('defers serializing result details until the debug log is evaluated', () => {
    const debug = jest.fn();
    const cursor = new TestSearchCursor(
      'test-index-pattern-string',
      {} as never,
      {} as never,
      new AbortController(),
      { debug } as never
    );
    const stringifySpy = jest.spyOn(JSON, 'stringify');

    cursor.logResults();

    expect(stringifySpy).not.toHaveBeenCalled();
    const resultDetailsLog = debug.mock.calls[1][0];
    expect(resultDetailsLog()).toContain('Result details:');
    expect(stringifySpy).toHaveBeenCalledTimes(1);
  });
});
