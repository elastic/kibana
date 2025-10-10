/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '..';

describe('map expression', () => {
  it('a map can be empty', () => {
    const query = 'ROW fn(1, {})';
    const { errors } = Parser.parse(query);

    expect(errors.length).toBe(0);
  });

  it('errors when trailing map argument is the single function argument', () => {
    const query = 'ROW fn({"foo" : "bar"})';
    const { errors } = Parser.parse(query);

    expect(errors.length > 0).toBe(true);
  });

  it('function call with a trailing map with a single entry', () => {
    const query = 'ROW fn(1, {"foo" : "bar"})';
    const { root, errors } = Parser.parse(query);

    expect(errors.length).toBe(0);
    expect(root.commands).toMatchObject([
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
    const { root, errors } = Parser.parse(query);

    expect(errors.length).toBe(0);
    expect(root.commands).toMatchObject([
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

  it('can parse nested map expression', () => {
    const query = 'ROW fn(1, {"foo" : {"bar" : "baz"}})';
    const { root, errors } = Parser.parse(query);

    expect(errors.length).toBe(0);
    expect(root.commands).toMatchObject([
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
                      type: 'map',
                      entries: [
                        {
                          type: 'map-entry',
                          key: {
                            type: 'literal',
                            literalType: 'keyword',
                            valueUnquoted: 'bar',
                          },
                          value: {
                            type: 'literal',
                            literalType: 'keyword',
                            valueUnquoted: 'baz',
                          },
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

  it('can parse all literal types', () => {
    const query = `ROW fn(1, {
        "int": 1,
        "map": {
          "bar" : "baz",
          "oneMoreMap": { "a": 1 },
          "emptyMap": {}
        },
        "bool": TRUE,
        "str": "hello",
        "list": [1, 2, 3],
        "float": 1.23,
        "null": NULL
      })`;
    const { root, errors } = Parser.parse(query);

    expect(errors.length).toBe(0);
    expect(root.commands).toMatchObject([
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
                      valueUnquoted: 'int',
                    },
                    value: { type: 'literal', literalType: 'integer', value: 1 },
                  },
                  {
                    type: 'map-entry',
                    key: {
                      valueUnquoted: 'map',
                    },
                    value: {
                      type: 'map',
                      entries: [
                        {
                          type: 'map-entry',
                          key: {
                            valueUnquoted: 'bar',
                          },
                          value: {
                            type: 'literal',
                            literalType: 'keyword',
                            valueUnquoted: 'baz',
                          },
                        },
                        {
                          type: 'map-entry',
                          key: {
                            valueUnquoted: 'oneMoreMap',
                          },
                          value: {
                            type: 'map',
                            entries: [
                              {
                                type: 'map-entry',
                                key: {
                                  valueUnquoted: 'a',
                                },
                                value: { type: 'literal', literalType: 'integer', value: 1 },
                              },
                            ],
                          },
                        },
                        {
                          type: 'map-entry',
                          key: {
                            valueUnquoted: 'emptyMap',
                          },
                          value: {
                            type: 'map',
                            entries: [],
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: 'map-entry',
                    key: {
                      valueUnquoted: 'bool',
                    },
                    value: { type: 'literal', literalType: 'boolean', value: 'TRUE' },
                  },
                  {
                    type: 'map-entry',
                    key: {
                      valueUnquoted: 'str',
                    },
                    value: { type: 'literal', literalType: 'keyword', valueUnquoted: 'hello' },
                  },
                  {
                    type: 'map-entry',
                    key: {
                      valueUnquoted: 'list',
                    },
                    value: {
                      type: 'list',
                      values: [
                        { type: 'literal', literalType: 'integer', value: 1 },
                        { type: 'literal', literalType: 'integer', value: 2 },
                        { type: 'literal', literalType: 'integer', value: 3 },
                      ],
                    },
                  },
                  {
                    type: 'map-entry',
                    key: {
                      valueUnquoted: 'float',
                    },
                    value: { type: 'literal', literalType: 'double', value: 1.23 },
                  },
                  {
                    type: 'map-entry',
                    key: {
                      valueUnquoted: 'null',
                    },
                    value: { type: 'literal', literalType: 'null' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('lists are not nestable', () => {
    const query = 'ROW fn(1, {"foo" : [{"bar" : "baz"}]})';
    const { errors } = Parser.parse(query);

    expect(errors.length > 0).toBe(true);
  });

  describe('malformed', () => {
    it('report errors for incomplete field values', () => {
      const query = 'ROW FN(1, { "foo":';
      const { errors } = Parser.parse(query);

      expect(errors.length > 0).toBe(true);
    });

    it('report errors for incomplete field values - 2', () => {
      const query = 'ROW FN(1, { "foo"';
      const { errors } = Parser.parse(query);

      expect(errors.length > 0).toBe(true);
    });
  });
});
