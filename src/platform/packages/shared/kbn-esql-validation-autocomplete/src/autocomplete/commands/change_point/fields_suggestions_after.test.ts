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

describe('fieldsSuggestionsAfterChangePoint', () => {
  const changePointCommandWithoutAs = {
    name: 'change_point',
    args: [
      {
        args: [
          {
            name: 'count',
            location: {
              min: 143,
              max: 147,
            },
            text: 'count',
            incomplete: false,
            type: 'identifier',
          },
        ],
        location: {
          min: 143,
          max: 147,
        },
        text: 'count',
        incomplete: false,
        parts: ['count'],
        quoted: false,
        name: 'count',
        type: 'column',
      },
      {
        name: 'on',
        args: [
          {
            args: [
              {
                name: 'field1',
                location: {
                  min: 152,
                  max: 160,
                },
                text: 'field1',
                incomplete: false,
                type: 'identifier',
              },
            ],
            location: {
              min: 152,
              max: 168,
            },
            text: 'field1',
            incomplete: false,
            parts: ['field1'],
            quoted: false,
            name: 'field1',
            type: 'column',
          },
        ],
        location: {
          min: 149,
          max: 168,
        },
        text: '',
        incomplete: false,
        type: 'option',
      },
    ],
    location: {
      min: 130,
      max: 168,
    },
    text: 'CHANGE_POINTcountONfield1',
    type: 'command',
  } as unknown as ESQLAstCommand;

  const changePointCommandWithAs = {
    name: 'change_point',
    args: [
      {
        args: [
          {
            name: 'count',
            location: {
              min: 143,
              max: 147,
            },
            text: 'count',
            incomplete: false,
            type: 'identifier',
          },
        ],
        location: {
          min: 143,
          max: 147,
        },
        text: 'count',
        incomplete: false,
        parts: ['count'],
        quoted: false,
        name: 'count',
        type: 'column',
      },
      {
        name: 'on',
        args: [
          {
            args: [
              {
                name: 'field1',
                location: {
                  min: 152,
                  max: 160,
                },
                text: 'field1',
                incomplete: false,
                type: 'identifier',
              },
            ],
            location: {
              min: 152,
              max: 168,
            },
            text: 'field1',
            incomplete: false,
            parts: ['field1'],
            quoted: false,
            name: 'field1',
            type: 'column',
          },
        ],
        location: {
          min: 149,
          max: 168,
        },
        text: '',
        incomplete: false,
        type: 'option',
      },
      {
        name: 'as',
        args: [
          {
            args: [
              {
                name: 'changePointType',
                location: {
                  min: 173,
                  max: 187,
                },
                text: 'changePointType',
                incomplete: false,
                type: 'identifier',
              },
            ],
            location: {
              min: 173,
              max: 187,
            },
            text: 'changePointType',
            incomplete: false,
            parts: ['changePointType'],
            quoted: false,
            name: 'changePointType',
            type: 'column',
          },
          {
            args: [
              {
                name: 'pValue',
                location: {
                  min: 190,
                  max: 195,
                },
                text: 'pValue',
                incomplete: false,
                type: 'identifier',
              },
            ],
            location: {
              min: 190,
              max: 195,
            },
            text: 'pValue',
            incomplete: false,
            parts: ['pValue'],
            quoted: false,
            name: 'pValue',
            type: 'column',
          },
        ],
        location: {
          min: 170,
          max: 195,
        },
        text: '',
        incomplete: false,
        type: 'option',
      },
    ],
    location: {
      min: 130,
      max: 195,
    },
    text: 'CHANGE_POINTcountONextension.keywordASchangePointType,pValue',
    incomplete: false,
    type: 'command',
  } as unknown as ESQLAstCommand;

  it('should return the correct fields after the command without AS option', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      changePointCommandWithoutAs,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
      { name: 'type', type: 'keyword' },
      { name: 'pvalue', type: 'double' },
    ]);
  });

  it('should return the correct fields after the command with AS option', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      changePointCommandWithAs,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
      { name: 'changePointType', type: 'keyword' },
      { name: 'pValue', type: 'double' },
    ]);
  });
});
