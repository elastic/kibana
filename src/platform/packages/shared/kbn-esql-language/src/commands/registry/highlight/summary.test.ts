/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '@elastic/esql/types';
import { summary } from './summary';
import { HIGHLIGHT_CONTENT_COLUMN } from './columns_after';

// HIGHLIGHT is a DEV command not recognized by synth.cmd; summary doesn't use the command arg.
const stubCommand = { name: 'highlight' } as unknown as ESQLCommand;

describe('HIGHLIGHT > summary', () => {
  it('returns highlight_content as a new column', () => {
    const result = summary(stubCommand, '');
    expect(result).toEqual({ newColumns: new Set([HIGHLIGHT_CONTENT_COLUMN]) });
  });
});
