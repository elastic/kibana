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
  const transformOut = (controlGroupJson: string | undefined) =>
    transformControlPanelsOut(controlGroupJson, 'tab-1');

  describe('transformControlPanelsOut', () => {
    it('maps stored controlGroupJson to API control_panels and normalizes legacy type', () => {
      const { panels } = transformOut(
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

      expect(panels).toEqual([
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

    it('returns a warning when control JSON is invalid', () => {
      const { panels, warnings } = transformOut('not-json');

      expect(panels).toBeUndefined();
      expect(warnings).toEqual([
        expect.objectContaining({
          type: 'dropped_property',
          tab_id: 'tab-1',
          key: 'control_panels',
        }),
      ]);
    });

    it('returns a warning when control JSON is not an object', () => {
      const { panels, warnings } = transformOut('[]');

      expect(panels).toBeUndefined();
      expect(warnings).toEqual([
        expect.objectContaining({
          type: 'dropped_property',
          tab_id: 'tab-1',
          key: 'control_panels',
        }),
      ]);
    });

    it('returns no panels or warnings when controlGroupJson is undefined', () => {
      expect(transformOut(undefined)).toEqual({ panels: undefined, warnings: [] });
    });

    it('returns a warning when a stored panel entry is malformed', () => {
      const { panels, warnings } = transformOut(
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
      );

      expect(panels?.map(({ id }) => id)).toEqual(['good']);
      expect(warnings).toEqual([
        expect.objectContaining({ type: 'dropped_panel', tab_id: 'tab-1', panel_id: 'bad' }),
      ]);
    });

    it('converts legacy camelCase config keys to snake_case', () => {
      const { panels } = transformOut(
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

      expect(panels).toEqual([
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

    it('returns no panels or warnings for an empty controlGroupJson object', () => {
      expect(transformOut('{}')).toEqual({ panels: undefined, warnings: [] });
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
      expect(transformOut(stored).panels).toEqual(controlPanels);
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

      const { panels: apiPanels } = transformOut(legacyStored);
      const storedAgain = transformControlPanelsIn(apiPanels);

      expect(transformOut(storedAgain).panels).toEqual(apiPanels);
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
