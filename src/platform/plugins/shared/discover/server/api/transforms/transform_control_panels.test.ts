/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { DiscoverSessionControlPanels } from '../schema';
import { transformControlPanelsIn, transformControlPanelsOut } from './transform_control_panels';

describe('control panel transforms', () => {
  describe('transformControlPanelsOut', () => {
    it('maps stored controlGroupJson to API control_panels and normalizes legacy type', () => {
      const result = transformControlPanelsOut(
        JSON.stringify({
          b: {
            order: 1,
            type: 'esqlControl',
            width: 'small',
            grow: false,
            control_type: 'STATIC_VALUES',
            variable_name: 'bar',
            variable_type: 'values',
            available_options: ['a', 'b'],
            selected_options: ['b'],
            single_select: true,
          },
          a: {
            order: 0,
            type: ESQL_CONTROL,
            width: 'medium',
            grow: true,
            control_type: 'STATIC_VALUES',
            variable_name: 'foo',
            variable_type: 'values',
            available_options: ['x', 'y'],
            selected_options: ['x'],
            single_select: true,
          },
        })
      );

      expect(result).toEqual([
        {
          id: 'a',
          type: ESQL_CONTROL,
          width: 'medium',
          grow: true,
          config: {
            control_type: 'STATIC_VALUES',
            variable_name: 'foo',
            variable_type: 'values',
            available_options: ['x', 'y'],
            selected_options: ['x'],
            single_select: true,
          },
        },
        {
          id: 'b',
          type: ESQL_CONTROL,
          width: 'small',
          grow: false,
          config: {
            control_type: 'STATIC_VALUES',
            variable_name: 'bar',
            variable_type: 'values',
            available_options: ['a', 'b'],
            selected_options: ['b'],
            single_select: true,
          },
        },
      ]);
    });

    it('throws when control JSON is invalid', () => {
      expect(() => transformControlPanelsOut('not-json')).toThrow(
        'controlGroupJson is not valid JSON'
      );
    });

    it('returns undefined when controlGroupJson is undefined', () => {
      expect(transformControlPanelsOut(undefined)).toBeUndefined();
    });

    it('throws when stored panel entries are malformed', () => {
      expect(() =>
        transformControlPanelsOut(
          JSON.stringify({
            bad: null,
            good: {
              order: 0,
              type: 'esqlControl',
              control_type: 'STATIC_VALUES',
              variable_name: 'foo',
              variable_type: 'values',
              available_options: ['a'],
              selected_options: ['a'],
              single_select: true,
            },
          })
        )
      ).toThrow('controlGroupJson must be a JSON object');
    });

    it('converts legacy camelCase config keys to snake_case', () => {
      const result = transformControlPanelsOut(
        JSON.stringify({
          'control-1': {
            order: 0,
            type: 'esqlControl',
            width: 'medium',
            grow: true,
            controlType: 'STATIC_VALUES',
            variableName: 'foo',
            variableType: 'values',
            availableOptions: ['x', 'y'],
            selectedOptions: ['x'],
            singleSelect: true,
          },
        })
      );

      expect(result).toEqual([
        {
          id: 'control-1',
          type: ESQL_CONTROL,
          width: 'medium',
          grow: true,
          config: {
            control_type: 'STATIC_VALUES',
            variable_name: 'foo',
            variable_type: 'values',
            available_options: ['x', 'y'],
            selected_options: ['x'],
            single_select: true,
          },
        },
      ]);
    });

    it('returns undefined for empty controlGroupJson object', () => {
      expect(transformControlPanelsOut('{}')).toBeUndefined();
    });
  });

  describe('round-trip', () => {
    const controlPanels: DiscoverSessionControlPanels = [
      {
        id: 'control-1',
        type: ESQL_CONTROL,
        width: 'medium',
        grow: true,
        config: {
          control_type: 'STATIC_VALUES',
          variable_name: 'foo',
          variable_type: 'values',
          available_options: ['x', 'y'],
          selected_options: ['x'],
          single_select: true,
        },
      },
      {
        id: 'control-2',
        type: ESQL_CONTROL,
        width: 'small',
        grow: false,
        config: {
          control_type: 'STATIC_VALUES',
          variable_name: 'bar',
          variable_type: 'values',
          available_options: ['a', 'b'],
          selected_options: ['b'],
          single_select: true,
        },
      },
    ];

    it('round-trips API control_panels through stored controlGroupJson', () => {
      const stored = transformControlPanelsIn(controlPanels);
      expect(transformControlPanelsOut(stored)).toEqual(controlPanels);
    });

    it('round-trips legacy stored controlGroupJson through API control_panels', () => {
      const legacyStored = JSON.stringify({
        b: {
          order: 1,
          type: 'esqlControl',
          width: 'small',
          grow: false,
          control_type: 'STATIC_VALUES',
          variable_name: 'bar',
          variable_type: 'values',
          available_options: ['a', 'b'],
          selected_options: ['b'],
          single_select: true,
        },
        a: {
          order: 0,
          type: ESQL_CONTROL,
          width: 'medium',
          grow: true,
          control_type: 'STATIC_VALUES',
          variable_name: 'foo',
          variable_type: 'values',
          available_options: ['x', 'y'],
          selected_options: ['x'],
          single_select: true,
        },
      });

      const apiPanels = transformControlPanelsOut(legacyStored);
      const storedAgain = transformControlPanelsIn(apiPanels);

      expect(transformControlPanelsOut(storedAgain)).toEqual(apiPanels);
    });
  });

  describe('transformControlPanelsIn', () => {
    it('maps API control_panels to stored flattened controlGroupJson', () => {
      const result = transformControlPanelsIn([
        {
          id: 'control-1',
          type: ESQL_CONTROL,
          width: 'small',
          grow: true,
          config: {
            control_type: 'STATIC_VALUES',
            variable_name: 'foo',
            variable_type: 'values',
            available_options: ['x', 'y'],
            selected_options: ['y'],
            single_select: true,
          },
        },
      ]);

      expect(result).toBe(
        JSON.stringify({
          'control-1': {
            order: 0,
            type: ESQL_CONTROL,
            width: 'small',
            grow: true,
            control_type: 'STATIC_VALUES',
            variable_name: 'foo',
            variable_type: 'values',
            available_options: ['x', 'y'],
            selected_options: ['y'],
            single_select: true,
          },
        })
      );
    });

    it('returns undefined for empty control arrays', () => {
      expect(transformControlPanelsIn(undefined)).toBeUndefined();
      expect(transformControlPanelsIn([])).toBeUndefined();
    });
  });
});
