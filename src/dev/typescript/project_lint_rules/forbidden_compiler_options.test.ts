/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';

import { removeCompilerOption } from './forbidden_compiler_options';

describe('removeCompilerOption()', () => {
  it('handles strings with trailing comma', () => {
    const updated = removeCompilerOption(
      dedent`
        {
          "compilerOptions": {
            "foo": "bar",
          }
        }
      `,
      'foo'
    );

    expect(updated).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
        }
      }"
    `);
  });
  it('handles booleans with trailing comma', () => {
    const updated = removeCompilerOption(
      dedent`
        {
          "compilerOptions": {
            "foo": true,
          }
        }
      `,
      'foo'
    );

    expect(updated).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
        }
      }"
    `);
  });
  it('handles numbers with trailing comma', () => {
    const updated = removeCompilerOption(
      dedent`
        {
          "compilerOptions": {
            "foo": 1,
          }
        }
      `,
      'foo'
    );

    expect(updated).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
        }
      }"
    `);
  });
  it('handles inline properties', () => {
    const updated = removeCompilerOption(
      dedent`
        {
          "compilerOptions": {"foo": 1}
        }
      `,
      'foo'
    );

    expect(updated).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {}
      }"
    `);
  });
  it('handles inline properties with trailing commas', () => {
    const updated = removeCompilerOption(
      dedent`
        {
          "compilerOptions": {"foo": 1,}
        }
      `,
      'foo'
    );

    expect(updated).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {}
      }"
    `);
  });
});
