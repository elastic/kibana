/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLControlVariablesFromState } from './get_esql_control_variables';

const STATIC = 'STATIC_VALUES';
const FROM_QUERY = 'VALUES_FROM_QUERY';

describe('getESQLControlVariablesFromState', () => {
  it('publishes the selected option of a single-select control under its variable name', () => {
    expect(
      getESQLControlVariablesFromState([
        {
          variable_name: 'host',
          variable_type: 'values',
          selected_options: ['web-1'],
          single_select: true,
          control_type: STATIC,
        },
      ])
    ).toEqual([{ key: 'host', value: 'web-1', type: 'values' }]);
  });

  it('treats a control as single-select unless it says otherwise', () => {
    expect(
      getESQLControlVariablesFromState([
        { variable_name: 'host', variable_type: 'values', selected_options: ['web-1', 'web-2'] },
      ])
    ).toEqual([{ key: 'host', value: 'web-1', type: 'values' }]);
  });

  it('publishes every selected option of a multi-select control', () => {
    expect(
      getESQLControlVariablesFromState([
        {
          variable_name: 'hosts',
          variable_type: 'multi_values',
          selected_options: ['web-1', 'web-2'],
          single_select: false,
        },
      ])
    ).toEqual([{ key: 'hosts', value: ['web-1', 'web-2'], type: 'multi_values' }]);
  });

  it('publishes an empty string for a single-select control with nothing selected', () => {
    expect(
      getESQLControlVariablesFromState([
        { variable_name: 'host', variable_type: 'values', selected_options: [] },
        { variable_name: 'other', variable_type: 'values' },
      ])
    ).toEqual([
      { key: 'host', value: '', type: 'values' },
      { key: 'other', value: '', type: 'values' },
    ]);
  });

  it('publishes an empty list for a multi-select control with nothing selected', () => {
    expect(
      getESQLControlVariablesFromState([
        {
          variable_name: 'hosts',
          variable_type: 'multi_values',
          selected_options: [],
          single_select: false,
        },
        { variable_name: 'more', variable_type: 'multi_values', single_select: false },
      ])
    ).toEqual([
      { key: 'hosts', value: [], type: 'multi_values' },
      { key: 'more', value: [], type: 'multi_values' },
    ]);
  });

  describe('casting numeric-looking options', () => {
    it('casts them to numbers for a control with static values, like the live control', () => {
      expect(
        getESQLControlVariablesFromState([
          {
            variable_name: 'min_bytes',
            variable_type: 'values',
            selected_options: ['100'],
            control_type: STATIC,
          },
          {
            variable_name: 'codes',
            variable_type: 'multi_values',
            selected_options: ['404', 'abc', '500'],
            single_select: false,
            control_type: STATIC,
          },
        ])
      ).toEqual([
        { key: 'min_bytes', value: 100, type: 'values' },
        { key: 'codes', value: [404, 'abc', 500], type: 'multi_values' },
      ]);
    });

    it('guesses from the value for a control whose values come from a query and has no column type', () => {
      expect(
        getESQLControlVariablesFromState([
          {
            variable_name: 'code',
            variable_type: 'values',
            selected_options: ['404'],
            control_type: FROM_QUERY,
          },
          {
            variable_name: 'codes',
            variable_type: 'multi_values',
            selected_options: ['404', 'abc'],
            single_select: false,
            control_type: FROM_QUERY,
          },
        ])
      ).toEqual([
        { key: 'code', value: 404, type: 'values' },
        { key: 'codes', value: [404, 'abc'], type: 'multi_values' },
      ]);
    });

    it('casts the values of a query-based control by the column type given for it', () => {
      const queryControl = (name: string, selected: string[], extra = {}) => ({
        variable_name: name,
        variable_type: 'values',
        selected_options: selected,
        control_type: FROM_QUERY,
        ...extra,
      });

      expect(
        getESQLControlVariablesFromState(
          [
            queryControl('bytes', ['100']),
            queryControl('code', ['404']),
            queryControl('sizes', ['1', '2'], { single_select: false }),
          ],
          { bytes: 'long', code: 'keyword', sizes: 'integer' }
        )
      ).toEqual([
        { key: 'bytes', value: 100, type: 'values' },
        { key: 'code', value: '404', type: 'values' },
        { key: 'sizes', value: [1, 2], type: 'values' },
      ]);
    });

    it('ignores the column type given for a control with static values', () => {
      expect(
        getESQLControlVariablesFromState(
          [
            {
              variable_name: 'code',
              variable_type: 'values',
              selected_options: ['404'],
              control_type: STATIC,
            },
          ],
          { code: 'keyword' }
        )
      ).toEqual([{ key: 'code', value: 404, type: 'values' }]);
    });

    it('passes a numeric option through as a number either way', () => {
      const state = { variable_name: 'n', variable_type: 'values', selected_options: [5] };
      expect(getESQLControlVariablesFromState([{ ...state, control_type: STATIC }])[0].value).toBe(
        5
      );
      expect(
        getESQLControlVariablesFromState([{ ...state, control_type: FROM_QUERY }])[0].value
      ).toBe(5);
    });
  });

  it('keeps the control types that name a field, a function or a time literal', () => {
    expect(
      getESQLControlVariablesFromState([
        { variable_name: 'field', variable_type: 'fields', selected_options: ['host.name'] },
        { variable_name: 'fn', variable_type: 'functions', selected_options: ['avg'] },
        { variable_name: 'interval', variable_type: 'time_literal', selected_options: ['1 hour'] },
      ]).map(({ key, type }) => [key, type])
    ).toEqual([
      ['field', 'fields'],
      ['fn', 'functions'],
      ['interval', 'time_literal'],
    ]);
  });

  it('reads one variable per control, in order', () => {
    expect(
      getESQLControlVariablesFromState([
        { variable_name: 'a', variable_type: 'values', selected_options: ['1'] },
        { variable_name: 'b', variable_type: 'values', selected_options: ['2'] },
      ]).map(({ key }) => key)
    ).toEqual(['a', 'b']);
  });

  it.each([
    ['null', null],
    ['text', 'nope'],
    ['a list', []],
    ['an object with no variable name', { variable_type: 'values', selected_options: ['a'] }],
    ['an empty variable name', { variable_name: '', variable_type: 'values' }],
    ['a variable name that is not text', { variable_name: 7, variable_type: 'values' }],
    ['no variable type', { variable_name: 'host', selected_options: ['a'] }],
  ])('skips %s instead of failing', (_label, state) => {
    expect(getESQLControlVariablesFromState([state])).toEqual([]);
  });

  it('ignores selected options that are not text or numbers', () => {
    expect(
      getESQLControlVariablesFromState([
        {
          variable_name: 'hosts',
          variable_type: 'multi_values',
          selected_options: ['web-1', null, { a: 1 }, 5],
          single_select: false,
        },
      ])
    ).toEqual([{ key: 'hosts', value: ['web-1', 5], type: 'multi_values' }]);
  });
});
