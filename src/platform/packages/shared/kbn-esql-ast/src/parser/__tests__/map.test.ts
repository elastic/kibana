/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('map expression', () => {
  it('function call with an empty trailing map errors', () => {
    const query = 'ROW fn(1, {})';
    const { errors } = parse(query);

    expect(errors.length > 0).toBe(true);
  });

  it('errors when trailing map argument is the single function argument', () => {
    const query = 'ROW fn({"foo" : "bar"})';
    const { errors } = parse(query);

    expect(errors.length > 0).toBe(true);
  });

  it('function call with a trailing map with a single entry', () => {
    const query = 'ROW fn(1, {"foo" : "bar"})';
    const { ast, errors } = parse(query);

    expect(errors.length).toBe(0);
    expect(ast).toMatchObject([
      {
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: 'fn',
            args: [
              {
                type: 'literal',
                value: 1,
              },
              {
                type: 'map',
                entries: [
                  {
                    type: 'map-entry',
                    key: {
                      type: 'literal',
                      literalType: 'keyword',
                      valueUnquoted: 'foo',
                    },
                    value: {
                      type: 'literal',
                      literalType: 'keyword',
                      valueUnquoted: 'bar',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('multiple trailing map arguments with multiple keys', () => {
    const query =
      'ROW fn(1, fn2(1, {"a": TRUE, /* asdf */ "b" : 123}), {"foo" : "bar", "baz" : [1, 2, 3]})';
    const { ast, errors } = parse(query);

    expect(errors.length).toBe(0);
    expect(ast).toMatchObject([
      {
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: 'fn',
            args: [
              {
                type: 'literal',
                value: 1,
              },
              {
                type: 'function',
                name: 'fn2',
                args: [
                  {
                    type: 'literal',
                    value: 1,
                  },
                  {
                    type: 'map',
                    entries: [
                      {
                        type: 'map-entry',
                        key: {
                          type: 'literal',
                          literalType: 'keyword',
                          valueUnquoted: 'a',
                        },
                        value: {
                          type: 'literal',
                          literalType: 'boolean',
                          value: 'TRUE',
                        },
                      },
                      {
                        type: 'map-entry',
                        key: {
                          type: 'literal',
                          literalType: 'keyword',
                          valueUnquoted: 'b',
                        },
                        value: {
                          type: 'literal',
                          literalType: 'integer',
                          value: 123,
                        },
                      },
                    ],
                  },
                ],
              },
              {
                type: 'map',
                entries: [
                  {
                    type: 'map-entry',
                    key: {
                      type: 'literal',
                      literalType: 'keyword',
                      valueUnquoted: 'foo',
                    },
                    value: {
                      type: 'literal',
                      literalType: 'keyword',
                      valueUnquoted: 'bar',
                    },
                  },
                  {
                    type: 'map-entry',
                    key: {
                      type: 'literal',
                      literalType: 'keyword',
                      valueUnquoted: 'baz',
                    },
                    value: {
                      type: 'list',
                      values: [
                        {
                          type: 'literal',
                          literalType: 'integer',
                          value: 1,
                        },
                        {
                          type: 'literal',
                          literalType: 'integer',
                          value: 2,
                        },
                        {
                          type: 'literal',
                          literalType: 'integer',
                          value: 3,
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });
});
