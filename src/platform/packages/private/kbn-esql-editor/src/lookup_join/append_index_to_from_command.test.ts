/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendIndexToFromCommand } from './append_index_to_from_command';

describe('appendIndexToFromCommand', () => {
  it('adds the created index to an empty FROM command', () => {
    expect(appendIndexToFromCommand('FROM ', 'new_index')).toBe('FROM new_index');
  });

  it('appends the created index alongside existing sources', () => {
    expect(appendIndexToFromCommand('FROM existing', 'new_index')).toBe('FROM existing, new_index');
  });

  it('is a no-op when the index is already listed', () => {
    expect(appendIndexToFromCommand('FROM new_index', 'new_index')).toBe('FROM new_index');
  });

  it('returns the query unchanged when no index name is provided', () => {
    expect(appendIndexToFromCommand('FROM ', '')).toBe('FROM ');
  });
});
