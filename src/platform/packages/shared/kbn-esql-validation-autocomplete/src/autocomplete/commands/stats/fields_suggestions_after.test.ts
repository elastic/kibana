/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLAstCommand } from '@kbn/esql-ast';
import type { ESQLRealField } from '../../../validation/types';
import { fieldsSuggestionsAfter } from './fields_suggestions_after';

describe('fieldsSuggestionsAfterStats', () => {
  it('should return the correct fields after the command with no grouping and user defined column', () => {
    const statsCommandNoGroupingUserDefinedColumn = {
      name: 'stats',
      args: [
        {
          type: 'function',
          name: '=',
          text: 'var0=AVG(field2)',
          location: {
            min: 37,
            max: 53,
          },
          args: [
            {
              args: [
                {
                  name: 'var0',
                  location: {
                    min: 37,
                    max: 40,
                  },
                  text: 'var0',
                  incomplete: false,
                  type: 'identifier',
                },
              ],
              location: {
                min: 37,
                max: 40,
              },
              text: 'var0',
              incomplete: false,
              parts: ['var0'],
              quoted: false,
              name: 'var0',
              type: 'column',
            },
            [
              {
                type: 'function',
                subtype: 'variadic-call',
                name: 'avg',
                text: 'AVG(field2)',
                location: {
                  min: 44,
                  max: 53,
                },
                args: [
                  {
                    args: [
                      {
                        name: 'field2',
                        location: {
                          min: 48,
                          max: 52,
                        },
                        text: 'field2',
                        incomplete: false,
                        type: 'identifier',
                      },
                    ],
                    location: {
                      min: 48,
                      max: 52,
                    },
                    text: 'field2',
                    incomplete: false,
                    parts: ['field2'],
                    quoted: false,
                    name: 'field2',
                    type: 'column',
                  },
                ],
                incomplete: false,
                operator: {
                  name: 'AVG',
                  location: {
                    min: 44,
                    max: 46,
                  },
                  text: 'AVG',
                  incomplete: false,
                  type: 'identifier',
                },
              },
            ],
          ],
          incomplete: false,
          subtype: 'binary-expression',
        },
      ],
      location: {
        min: 31,
        max: 53,
      },
      text: 'STATSvar0=AVG(field2)',
      incomplete: false,
      type: 'command',
    } as unknown as ESQLAstCommand;
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [{ name: 'var0', type: 'double' }] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      statsCommandNoGroupingUserDefinedColumn,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([{ name: 'var0', type: 'double' }]);
  });

  it('should return the correct fields after the command with no grouping and no user defined column', () => {
    const statsCommandNoGroupingNoDefinedColumn = {
      name: 'stats',
      args: [
        {
          type: 'function',
          subtype: 'variadic-call',
          name: 'avg',
          text: 'AVG(field2)',
          location: {
            min: 37,
            max: 46,
          },
          args: [
            {
              args: [
                {
                  name: 'field2',
                  location: {
                    min: 41,
                    max: 45,
                  },
                  text: 'field2',
                  incomplete: false,
                  type: 'identifier',
                },
              ],
              location: {
                min: 41,
                max: 45,
              },
              text: 'field2',
              incomplete: false,
              parts: ['field2'],
              quoted: false,
              name: 'field2',
              type: 'column',
            },
          ],
          incomplete: false,
          operator: {
            name: 'AVG',
            location: {
              min: 37,
              max: 39,
            },
            text: 'AVG',
            incomplete: false,
            type: 'identifier',
          },
        },
      ],
      location: {
        min: 31,
        max: 46,
      },
      text: 'STATSAVG(field2)',
      incomplete: false,
      type: 'command',
    } as unknown as ESQLAstCommand;
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [{ name: 'AVG(field2)', type: 'double' }] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      statsCommandNoGroupingNoDefinedColumn,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([{ name: 'AVG(field2)', type: 'double' }]);
  });

  it('should return the correct fields after the command with grouping and no user defined column', () => {
    const statsCommandWithGroupingNoDefinedColumn = {
      name: 'stats',
      args: [
        {
          type: 'function',
          subtype: 'variadic-call',
          name: 'avg',
          text: 'AVG(field2)',
          location: {
            min: 37,
            max: 46,
          },
          args: [
            {
              args: [
                {
                  name: 'field2',
                  location: {
                    min: 41,
                    max: 45,
                  },
                  text: 'field2',
                  incomplete: false,
                  type: 'identifier',
                },
              ],
              location: {
                min: 41,
                max: 45,
              },
              text: 'field2',
              incomplete: false,
              parts: ['field2'],
              quoted: false,
              name: 'field2',
              type: 'column',
            },
          ],
          incomplete: false,
          operator: {
            name: 'AVG',
            location: {
              min: 37,
              max: 39,
            },
            text: 'AVG',
            incomplete: false,
            type: 'identifier',
          },
        },
        {
          type: 'option',
          name: 'by',
          text: 'STATSAVG(field2)BYfield1',
          location: {
            min: 48,
            max: 58,
          },
          args: [
            {
              args: [
                {
                  name: 'field1',
                  location: {
                    min: 51,
                    max: 58,
                  },
                  text: 'field1',
                  incomplete: false,
                  type: 'identifier',
                },
              ],
              location: {
                min: 51,
                max: 58,
              },
              text: 'field1',
              incomplete: false,
              parts: ['field1'],
              quoted: false,
              name: 'field1',
              type: 'column',
            },
          ],
          incomplete: false,
        },
      ],
      location: {
        min: 31,
        max: 58,
      },
      text: 'STATSAVG(field2)BYfield1',
      incomplete: false,
      type: 'command',
    } as unknown as ESQLAstCommand;
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [{ name: 'AVG(field2)', type: 'double' }] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      statsCommandWithGroupingNoDefinedColumn,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'AVG(field2)', type: 'double' },
    ]);
  });

  it('should return the correct fields after the command with grouping and user defined column', () => {
    const statsCommandWithGroupingAndDefinedColumn = {
      name: 'stats',
      args: [
        {
          type: 'function',
          subtype: 'variadic-call',
          name: 'avg',
          text: 'AVG(field2)',
          location: {
            min: 37,
            max: 46,
          },
          args: [
            {
              args: [
                {
                  name: 'field2',
                  location: {
                    min: 41,
                    max: 45,
                  },
                  text: 'field2',
                  incomplete: false,
                  type: 'identifier',
                },
              ],
              location: {
                min: 41,
                max: 45,
              },
              text: 'field2',
              incomplete: false,
              parts: ['field2'],
              quoted: false,
              name: 'field2',
              type: 'column',
            },
          ],
          incomplete: false,
          operator: {
            name: 'AVG',
            location: {
              min: 37,
              max: 39,
            },
            text: 'AVG',
            incomplete: false,
            type: 'identifier',
          },
        },
        {
          type: 'option',
          name: 'by',
          text: 'STATSAVG(field2)BYbuckets=BUCKET(@timestamp,50,?_tstart,?_tend)',
          location: {
            min: 48,
            max: 100,
          },
          args: [
            {
              type: 'function',
              name: '=',
              text: 'buckets=BUCKET(@timestamp,50,?_tstart,?_tend)',
              location: {
                min: 51,
                max: 100,
              },
              args: [
                {
                  args: [
                    {
                      name: 'buckets',
                      location: {
                        min: 51,
                        max: 57,
                      },
                      text: 'buckets',
                      incomplete: false,
                      type: 'identifier',
                    },
                  ],
                  location: {
                    min: 51,
                    max: 57,
                  },
                  text: 'buckets',
                  incomplete: false,
                  parts: ['buckets'],
                  quoted: false,
                  name: 'buckets',
                  type: 'column',
                },
                [
                  {
                    type: 'function',
                    subtype: 'variadic-call',
                    name: 'bucket',
                    text: 'BUCKET(@timestamp,50,?_tstart,?_tend)',
                    location: {
                      min: 61,
                      max: 100,
                    },
                    args: [
                      {
                        args: [
                          {
                            name: '@timestamp',
                            location: {
                              min: 68,
                              max: 77,
                            },
                            text: '@timestamp',
                            incomplete: false,
                            type: 'identifier',
                          },
                        ],
                        location: {
                          min: 68,
                          max: 77,
                        },
                        text: '@timestamp',
                        incomplete: false,
                        parts: ['@timestamp'],
                        quoted: false,
                        name: '@timestamp',
                        type: 'column',
                      },
                      {
                        value: 50,
                        literalType: 'integer',
                        location: {
                          min: 80,
                          max: 81,
                        },
                        text: '50',
                        incomplete: false,
                        type: 'literal',
                        name: '50',
                      },
                      {
                        paramKind: '?',
                        value: '_tstart',
                        location: {
                          min: 84,
                          max: 91,
                        },
                        text: '?_tstart',
                        incomplete: false,
                        name: '',
                        type: 'literal',
                        literalType: 'param',
                        paramType: 'named',
                      },
                      {
                        paramKind: '?',
                        value: '_tend',
                        location: {
                          min: 94,
                          max: 99,
                        },
                        text: '?_tend',
                        incomplete: false,
                        name: '',
                        type: 'literal',
                        literalType: 'param',
                        paramType: 'named',
                      },
                    ],
                    incomplete: false,
                    operator: {
                      name: 'BUCKET',
                      location: {
                        min: 61,
                        max: 66,
                      },
                      text: 'BUCKET',
                      incomplete: false,
                      type: 'identifier',
                    },
                  },
                ],
              ],
              incomplete: false,
              subtype: 'binary-expression',
            },
          ],
          incomplete: false,
        },
      ],
      location: {
        min: 31,
        max: 100,
      },
      text: 'STATSAVG(field2)BYbuckets=BUCKET(@timestamp,50,?_tstart,?_tend)',
      incomplete: false,
      type: 'command',
    } as unknown as ESQLAstCommand;
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
      { name: '@timestamp', type: 'date' },
    ] as ESQLRealField[];

    const userDefinedColumns = [
      { name: 'AVG(field2)', type: 'double' },
      { name: 'buckets', type: 'unknown' },
    ] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      statsCommandWithGroupingAndDefinedColumn,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'AVG(field2)', type: 'double' },
      { name: 'buckets', type: 'unknown' },
    ]);
  });
});
