/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectType } from 'tsd';
import { fromExternalVariant, type FromExternalVariant } from './from_external_variant';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Exporters = {
  langfuse: { url: string };
  phoenix: { baseUrl: string; apiKey: string };
};

type Expected =
  | { type: 'langfuse'; value: { url: string } }
  | { type: 'phoenix'; value: { baseUrl: string; apiKey: string } };

describe('fromExternalVariant', () => {
  it('returns the tag and value for a single-key record', () => {
    const input = { foo: 123 } as const;

    const variant = fromExternalVariant(input);

    expect(variant).toEqual({ type: 'foo', value: 123 });
  });

  it('throws when the record has more than one key', () => {
    expect(() =>
      fromExternalVariant({ a: 1, b: 2 } as unknown as { a: number; b: number })
    ).toThrowErrorMatchingInlineSnapshot(`"Expected one (1) key in object, found: 2"`);
  });

  it('produces a distributed-union type', () => {
    const langfuseVariant = fromExternalVariant({
      langfuse: { url: 'https://example.com' },
    });

    // Runtime assertion – ensure we still return the expected structure.
    expect(langfuseVariant.type).toBe('langfuse');
    expect(langfuseVariant.value).toEqual({ url: 'https://example.com' });
  });
});

// produces the correct distributed union
expectType<Expected>({} as FromExternalVariant<Exporters>);
expectType<FromExternalVariant<Exporters>>({} as Expected);

/* ------------------------------------------------------------------------
 * 2 fromExternalVariant() narrows the return value correctly
 * --------------------------------------------------------------------- */
// narrows the return
const variant = fromExternalVariant({ langfuse: { url: 'https://e.com' } } as const);

expectType<'langfuse'>(variant.type);
expectType<{ url: string }>(variant.value);

// Branch-specific property access should compile
if (variant.type === 'langfuse') {
  expectType<string>(variant.value.url);
  // while invalid properties should error
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  variant.value.apiKey;
}
