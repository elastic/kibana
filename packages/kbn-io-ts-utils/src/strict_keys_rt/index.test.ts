/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { isRight, isLeft } from 'fp-ts/lib/Either';
import { strictKeysRt } from './';
import { jsonRt } from '../json_rt';

describe('strictKeysRt', () => {
  it('correctly and deeply validates object keys', () => {
    const checks: Array<{ type: t.Type<any>; passes: any[]; fails: any[] }> = [
      {
        type: t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.string })]),
        passes: [{ foo: '' }, { foo: '', bar: '' }],
        fails: [
          { foo: '', unknownKey: '' },
          { foo: '', bar: '', unknownKey: '' },
        ],
      },
      {
        type: t.type({
          path: t.union([t.type({ serviceName: t.string }), t.type({ transactionType: t.string })]),
        }),
        passes: [{ path: { serviceName: '' } }, { path: { transactionType: '' } }],
        fails: [
          { path: { serviceName: '', unknownKey: '' } },
          { path: { transactionType: '', unknownKey: '' } },
          { path: { serviceName: '', transactionType: '' } },
          { path: { serviceName: '' }, unknownKey: '' },
        ],
      },
      {
        type: t.intersection([
          t.type({ query: t.type({ bar: t.string }) }),
          t.partial({ query: t.partial({ _inspect: t.boolean }) }),
        ]),
        passes: [{ query: { bar: '', _inspect: true } }],
        fails: [{ query: { _inspect: true } }],
      },
    ];

    checks.forEach((check) => {
      const { type, passes, fails } = check;

      const strictType = strictKeysRt(type);

      passes.forEach((value) => {
        const result = strictType.decode(value);

        if (!isRight(result)) {
          throw new Error(
            `Expected ${JSON.stringify(value)} to be allowed, but validation failed with ${
              result.left[0].message
            }`
          );
        }
      });

      fails.forEach((value) => {
        const result = strictType.decode(value);

        if (!isLeft(result)) {
          throw new Error(
            `Expected ${JSON.stringify(value)} to be disallowed, but validation succeeded`
          );
        }
      });
    });
  });

  it('does not support piped types', () => {
    const typeA = t.type({
      query: t.type({ filterNames: jsonRt.pipe(t.array(t.string)) }),
    } as Record<string, any>);

    const typeB = t.partial({
      query: t.partial({ _inspect: jsonRt.pipe(t.boolean) }),
    });

    const value = {
      query: {
        _inspect: 'true',
        filterNames: JSON.stringify(['host', 'agentName']),
      },
    };

    const pipedType = strictKeysRt(typeA.pipe(typeB));

    expect(isLeft(pipedType.decode(value))).toBe(true);
  });
});
