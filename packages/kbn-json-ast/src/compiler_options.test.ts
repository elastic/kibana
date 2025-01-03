/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

import { removeCompilerOption, setCompilerOption } from './compiler_options';

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

  it('handles non-existent compiler options', () => {
    expect(
      setCompilerOption(
        dedent`
          {
            "extends": "../../tsconfig.base.json",
            "include": [
              "expect.d.ts"
            ]
          }
        `,
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

    expect(
      setCompilerOption(
        dedent`
          {
            "include": [
              "expect.d.ts"
            ],
            "extends": "../../tsconfig.base.json"
          }
        `,
        'outDir',
        'foo/bar'
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"include\\": [
          \\"expect.d.ts\\"
        ],
        \\"extends\\": \\"../../tsconfig.base.json\\",
        \\"compilerOptions\\": {
          \\"outDir\\": \\"foo/bar\\"
        }
      }"
    `);
    expect(
      setCompilerOption(
        dedent`
          {}
        `,
        'outDir',
        'foo/bar'
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
          \\"outDir\\": \\"foo/bar\\"
        }
      }"
    `);
    expect(
      setCompilerOption(
        dedent`
          {
            "foo": "bar"
          }
        `,
        'outDir',
        'foo/bar'
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"compilerOptions\\": {
          \\"outDir\\": \\"foo/bar\\"
        },
        \\"foo\\": \\"bar\\"
      }"
    `);
  });
});
