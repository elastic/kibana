/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toColoredDisplayText, toDisplayText } from './ansi';

describe('toColoredDisplayText', () => {
  it('keeps colours and ends with a reset', () => {
    expect(toColoredDisplayText('\u001b[33m[WARN ]\u001b[39m\tsome warning')).toBe(
      '\u001b[33m[WARN ]\u001b[39m    some warning\u001b[0m'
    );
  });

  it('drops other escape sequences and control characters', () => {
    // A cursor movement and a bell, next to a colour.
    expect(toColoredDisplayText('\u001b[2K\u001b[1Gloading \u001b[32mdone\u001b[39m\u0007')).toBe(
      'loading \u001b[32mdone\u001b[39m\u001b[0m'
    );
  });

  it('leaves plain text as it is, without a reset', () => {
    expect(toColoredDisplayText('plain\ttext')).toBe(toDisplayText('plain\ttext'));
    expect(toColoredDisplayText('plain')).toBe('plain');
  });
});
