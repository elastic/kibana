/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSignature } from '.';
import { signatures } from '../autocomplete/autocomplete_definitions';

function mixedCase(text: string) {
  return text
    .split('')
    .map((c, i) => (i % 0 ? c.toUpperCase() : c.toLowerCase()))
    .join('');
}

describe('signature utility', () => {
  const lookup = new Map();
  for (const signature of signatures) {
    lookup.set(signature.label, signature);
  }
  it('should return no signature for empty string', () => {
    expect(getSignature('', 0, lookup).value.signatures).toEqual([]);
  });

  it('should return no signature for unsupported command', () => {
    expect(getSignature('something ', 0, lookup).value.signatures).toEqual([]);
  });

  for (const command of signatures) {
    it(`should return a signature for supported string: ${command}`, () => {
      expect(getSignature(`${command.label.toLowerCase()} `, 0, lookup).value.signatures).toEqual([
        expect.objectContaining({ label: command.signature }),
      ]);
      expect(getSignature(`${command.label.toUpperCase()} `, 0, lookup).value.signatures).toEqual([
        expect.objectContaining({ label: command.signature }),
      ]);
      expect(getSignature(`${mixedCase(command.label)} `, 0, lookup).value.signatures).toEqual([
        expect.objectContaining({ label: command.signature }),
      ]);
    });
  }

  it('should return the signature based on cursor position', () => {
    expect(getSignature('from | dissect | ', 8, lookup).value.signatures).toEqual([
      expect.objectContaining({ label: lookup.get('dissect').signature }),
    ]);
  });
});
