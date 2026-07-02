/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { columnsAfter, HIGHLIGHT_CONTENT_COLUMN } from './columns_after';

// HIGHLIGHT is a DEV command not recognized by synth.cmd; columnsAfter doesn't use the command arg.
const stubCommand = { name: 'highlight' } as unknown as ESQLCommand;

describe('HIGHLIGHT > columnsAfter', () => {
  it('appends highlight_content (keyword, userDefined: false) to previous columns', () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'title', type: 'text', userDefined: false },
      { name: 'count', type: 'integer', userDefined: false },
    ];

    const result = columnsAfter(stubCommand, previousColumns);

    expect(result).toEqual([
      { name: 'title', type: 'text', userDefined: false },
      { name: 'count', type: 'integer', userDefined: false },
      { name: HIGHLIGHT_CONTENT_COLUMN, type: 'keyword', userDefined: false },
    ]);
  });

  it('deduplicates highlight_content when already present in previous columns', () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'title', type: 'text', userDefined: false },
      { name: HIGHLIGHT_CONTENT_COLUMN, type: 'keyword', userDefined: false },
    ];

    const result = columnsAfter(stubCommand, previousColumns);

    expect(result.filter((c) => c.name === HIGHLIGHT_CONTENT_COLUMN)).toHaveLength(1);
  });
});
