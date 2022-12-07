/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';

import { removeCompilerOption, setCompilerOption, setExclude } from './ast';

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

describe('setCompilerOptions()', () => {
  it('updated existing compiler options', () => {
    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {"foo": 1}
          }
        `,
        'foo',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {\\"foo\\": 2}
      }"
    `);

    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {"foo": true}
          }
        `,
        'foo',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {\\"foo\\": 2}
      }"
    `);

    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {"foo": "bar"}
          }
        `,
        'foo',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {\\"foo\\": 2}
      }"
    `);

    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {
              "foo": "bar"
            }
          }
        `,
        'foo',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
          \\"foo\\": 2
        }
      }"
    `);

    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {
              "foo": "bar",
            }
          }
        `,
        'foo',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
          \\"foo\\": 2,
        }
      }"
    `);
  });

  it('expands single line compiler options', () => {
    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {"foo": 1}
          }
        `,
        'bar',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
          \\"foo\\": 1,
          \\"bar\\": 2
        }
      }"
    `);
  });

  it('adds to multi-line compiler options', () => {
    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {
              "foo": 1
            }
          }
        `,
        'bar',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
          \\"foo\\": 1,
          \\"bar\\": 2
        }
      }"
    `);

    expect(
      setCompilerOption(
        dedent`
          {
            "compilerOptions": {
              "foo": 1,
            }
          }
        `,
        'bar',
        2
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
          \\"foo\\": 1,
          \\"bar\\": 2,
        }
      }"
    `);

    expect(
      setCompilerOption(
        removeCompilerOption(
          dedent`
            {
              "extends": "../../tsconfig.base.json",
              "compilerOptions": {
                "skipLibCheck": false
              },
              "include": [
                "expect.d.ts"
              ]
            }
          `,
          'skipLibCheck'
        ),

        'outDir',
        'foo/bar'
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"extends\\": \\"../../tsconfig.base.json\\",
        \\"compilerOptions\\": {
          \\"outDir\\": \\"foo/bar\\"
        },
        \\"include\\": [
          \\"expect.d.ts\\"
        ]
      }"
    `);
  });
});

describe('setExclude()', () => {
  it('overwrites previous formatting', () => {
    expect(
      setExclude(
        dedent`
          {
            "exclude": [1, 2,
              "foo"
            ]
          }
        `,
        ['1', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"exclude\\": [
          \\"1\\",
          \\"bar\\",
        ]
      }"
    `);
  });

  it('adds the property at the end if it does not exist', () => {
    expect(
      setExclude(
        dedent`
          {
            "foo": 1
          }
        `,
        ['1', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"foo\\": 1,
        \\"exclude\\": [
          \\"1\\",
          \\"bar\\",
        ]
      }"
    `);
    expect(
      setExclude(
        dedent`
          {
            "foo": 1,
          }
        `,
        ['1', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"foo\\": 1,
        \\"exclude\\": [
          \\"1\\",
          \\"bar\\",
        ],
      }"
    `);
  });
});
