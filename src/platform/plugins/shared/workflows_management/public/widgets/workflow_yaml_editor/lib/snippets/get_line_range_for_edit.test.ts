/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { getLineRangeForEdit } from './get_line_range_for_edit';

describe('getLineRangeForEdit', () => {
  it('returns undefined for empty text', () => {
    expect(getLineRangeForEdit(new monaco.Range(1, 1, 1, 1), '')).toBeUndefined();
  });

  it('maps a simple multi-line insert at column 1', () => {
    expect(
      getLineRangeForEdit(
        new monaco.Range(5, 1, 5, 1),
        '  - name: wait_step\n    type: wait\n    with:\n      duration: 5s\n'
      )
    ).toEqual({ lineStart: 5, lineEnd: 8 });
  });

  it('advances past a leading newline when inserting mid-line', () => {
    expect(
      getLineRangeForEdit(new monaco.Range(4, 20, 4, 20), '\n  - name: wait_step\n    type: wait\n')
    ).toEqual({ lineStart: 5, lineEnd: 6 });
  });

  it('skips a leading steps: header and starts at the list item', () => {
    expect(
      getLineRangeForEdit(
        new monaco.Range(2, 1, 2, 1),
        'steps:\n  - name: wait_step\n    type: wait\n'
      )
    ).toEqual({ lineStart: 3, lineEnd: 4 });
  });
});
