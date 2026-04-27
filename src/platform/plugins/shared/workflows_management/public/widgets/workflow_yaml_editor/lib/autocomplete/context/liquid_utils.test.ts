/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { isInsideLiquidBlock } from './liquid_utils';

const makePosition = (lineNumber: number, column: number): monaco.Position =>
  ({ lineNumber, column } as monaco.Position);

describe('isInsideLiquidBlock', () => {
  it('returns true when cursor is inside a liquid block', () => {
    const text = '{%- liquid\n  assign x = 1\n-%}';
    expect(isInsideLiquidBlock(text, makePosition(2, 5))).toBe(true);
  });

  it('returns false when cursor is outside a liquid block', () => {
    const text = '{%- liquid\n  assign x = 1\n-%}\nregular text';
    expect(isInsideLiquidBlock(text, makePosition(4, 5))).toBe(false);
  });

  it('returns false when there are no liquid blocks', () => {
    const text = 'steps:\n  - name: test\n    type: noop';
    expect(isInsideLiquidBlock(text, makePosition(2, 3))).toBe(false);
  });

  it('handles multiple liquid blocks', () => {
    const text = '{%- liquid\n  assign x = 1\n-%}\ntext\n{% liquid\n  echo x\n%}';
    // Inside second block
    expect(isInsideLiquidBlock(text, makePosition(6, 3))).toBe(true);
    // Between blocks
    expect(isInsideLiquidBlock(text, makePosition(4, 1))).toBe(false);
  });

  it('returns true at the first line after opening tag', () => {
    const text = '{%- liquid\nassign x = 1\n-%}';
    expect(isInsideLiquidBlock(text, makePosition(2, 1))).toBe(true);
  });
});
