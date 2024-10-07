/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

import { addReferences, removeReferences, replaceReferences } from './references';

describe('addReferences()', () => {
  it('replaces single line refs', () => {
    expect(
      addReferences(
        dedent`
          {
            "kbn_references": []
          }
        `,
        ['foo', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [
          \\"foo\\",
          \\"bar\\",
        ]
      }"
    `);
    expect(
      addReferences(
        dedent`
          {
            "kbn_references": [{"path": "x"}]
          }
        `,
        ['foo', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [
          { \\"path\\": \\"x\\" },
          \\"foo\\",
          \\"bar\\",
        ]
      }"
    `);
  });
  it('adds items to the end of existing expanded lists', () => {
    expect(
      addReferences(
        dedent`
          {
            "kbn_references": [
              // this is a comment
              {"path": "b"    },
              "other",
              "x",
            ]
          }
        `,
        ['foo', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [
          // this is a comment
          {\\"path\\": \\"b\\"    },
          \\"other\\",
          \\"x\\",
          \\"foo\\",
          \\"bar\\",
        ]
      }"
    `);
    expect(
      addReferences(
        dedent`
          {
            "kbn_references": [
              // this is a comment
              {"path": "b"    },
              "other",
              "x"
            ]
          }
        `,
        ['foo', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [
          // this is a comment
          {\\"path\\": \\"b\\"    },
          \\"other\\",
          \\"x\\",
          \\"foo\\",
          \\"bar\\"
        ]
      }"
    `);
  });
});

describe('removeReferences()', () => {
  it('throws if the values are not found', () => {
    expect(() =>
      removeReferences(
        dedent`
          {
            "kbn_references": []
          }
        `,
        ['foo']
      )
    ).toThrowErrorMatchingInlineSnapshot(`"unable to find reference \\"foo\\""`);
  });
  it('adds removes items from single-line and expanded lists', () => {
    expect(
      removeReferences(
        dedent`
          {
            "kbn_references": ["foo", "bar", "baz"]
          }
        `,
        ['foo', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [\\"baz\\"]
      }"
    `);
    expect(
      removeReferences(
        dedent`
          {
            "kbn_references": [
              // this is a comment
              {"path": "b"    },
              "other",
              "x",
            ]
          }
        `,
        ['other', 'x']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [
          // this is a comment
          {\\"path\\": \\"b\\"    },
        ]
      }"
    `);
    expect(
      removeReferences(
        dedent`
          {
            "kbn_references": [
              // this is a comment
              {"path": "b"    },
              "other",
              "x"
            ]
          }
        `,
        ['other']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [
          // this is a comment
          {\\"path\\": \\"b\\"    },
          \\"x\\"
        ]
      }"
    `);
  });
});

describe('replaceReferences()', () => {
  it('removes the old path refs and replaces them with the given pkgId', () => {
    expect(
      replaceReferences(
        dedent`
          {
            "kbn_references": [
              "@kbn/core",
              {
                "path": "foo",
              },
              "@kbn/other",
              { "path": "bar" }
            ]
          }
        `,
        [
          ['foo', '@kbn/a'],
          ['bar', '@kbn/b'],
        ]
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"kbn_references\\": [
          \\"@kbn/core\\",
          \\"@kbn/a\\",
          \\"@kbn/other\\",
          \\"@kbn/b\\"
        ]
      }"
    `);
  });
});
