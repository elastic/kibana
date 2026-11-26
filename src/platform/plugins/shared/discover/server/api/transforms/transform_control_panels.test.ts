/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import { MAX_DISCOVER_SESSION_CONTROL_PANELS } from '@kbn/discover-session-constants';
import type { DiscoverSessionApiControlPanels } from '../schema';
import { serializeEsqlControls } from '../../../common/session/control_panels';
import { transformControlPanelsOut } from './transform_control_panels';

describe('control panel transforms', () => {
  describe('transformControlPanelsOut', () => {
    it('maps stored controlGroupJson to API control_panels and normalizes legacy type', () => {
      const { panels } = transformControlPanelsOut(
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
        }),
        'tab-1'
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

    describe('warnings for invalid stored content', () => {
      it.each([
        { condition: 'invalid JSON', controlGroupJson: 'not-json', reason: 'Invalid JSON.' },
        {
          condition: 'not a JSON object',
          controlGroupJson: '[]',
          reason: 'Expected a JSON object.',
        },
      ])(
        'drops control_panels when controlGroupJson is $condition',
        ({ controlGroupJson, reason }) => {
          const { panels, warnings } = transformControlPanelsOut(controlGroupJson, 'tab-1');

          expect(panels).toBeUndefined();
          expect(warnings).toEqual([
            expect.objectContaining({
              type: 'dropped_property',
              tab_id: 'tab-1',
              key: 'control_panels',
              value: controlGroupJson,
              message: reason,
            }),
          ]);
        }
      );

      it('drops only a malformed panel entry', () => {
        const { panels, warnings } = transformControlPanelsOut(
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
          }),
          'tab-1'
        );

        expect(panels?.map(({ id }) => id)).toEqual(['good']);
        expect(warnings).toEqual([
          {
            type: 'dropped_item',
            tab_id: 'tab-1',
            key: 'control_panels',
            item_id: 'bad',
            message: 'Control configuration must be a JSON object.',
          },
        ]);
      });

      it('reports the config of a panel without a type', () => {
        const { warnings } = transformControlPanelsOut(
          JSON.stringify({ untyped: { order: 0, variable_name: 'foo' } }),
          'tab-1'
        );

        expect(warnings).toEqual([
          {
            type: 'dropped_item',
            tab_id: 'tab-1',
            key: 'control_panels',
            item_id: 'untyped',
            item_config: { order: 0, variable_name: 'foo' },
            message: 'Control type is missing or invalid.',
          },
        ]);
      });

      it('formats nested Zod validation errors as text instead of raw JSON', () => {
        const { panels, warnings } = transformControlPanelsOut(
          JSON.stringify({
            'invalid-width': {
              order: 0,
              type: ESQL_CONTROL,
              width: 'extra_large',
              control_type: 'STATIC_VALUES',
              variable_name: 'country',
              variable_type: 'values',
              available_options: ['US'],
              selected_options: ['US'],
              single_select: true,
            },
          }),
          'tab-1'
        );

        expect(panels).toBeUndefined();
        expect(warnings).toEqual([
          {
            type: 'dropped_item',
            tab_id: 'tab-1',
            key: 'control_panels',
            item_id: 'invalid-width',
            item_type: ESQL_CONTROL,
            item_config: {
              order: 0,
              width: 'extra_large',
              control_type: 'STATIC_VALUES',
              variable_name: 'country',
              variable_type: 'values',
              available_options: ['US'],
              selected_options: ['US'],
              single_select: true,
            },
            message: '✖ Invalid option: expected one of "small"|"medium"|"large"\n  → at width',
          },
        ]);
      });

      it('omits control_panels when all entries are malformed', () => {
        const { panels, warnings } = transformControlPanelsOut(
          JSON.stringify({ bad: null }),
          'tab-1'
        );

        expect(panels).toBeUndefined();
        expect(warnings).toEqual([
          expect.objectContaining({ type: 'dropped_item', tab_id: 'tab-1', item_id: 'bad' }),
        ]);
      });
    });

    it('returns no panels or warnings when controlGroupJson is absent', () => {
      expect(transformControlPanelsOut(undefined, 'tab-1')).toEqual({
        panels: undefined,
        warnings: [],
      });
      expect(transformControlPanelsOut('', 'tab-1')).toEqual({
        panels: undefined,
        warnings: [],
      });
    });

    it('converts legacy camelCase config keys to snake_case', () => {
      const { panels } = transformControlPanelsOut(
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
        }),
        'tab-1'
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
      expect(transformControlPanelsOut('{}', 'tab-1')).toEqual({
        panels: undefined,
        warnings: [],
      });
    });

    it('returns stored panels beyond the API control panel limit', () => {
      const panelCount = MAX_DISCOVER_SESSION_CONTROL_PANELS + 1;
      const controlGroupJson = JSON.stringify(
        Object.fromEntries(
          Array.from({ length: panelCount }, (_, order) => [
            `control-${order}`,
            {
              order,
              type: ESQL_CONTROL,
              control_type: 'STATIC_VALUES',
              variable_name: `variable-${order}`,
              variable_type: 'values',
              available_options: ['a'],
              selected_options: ['a'],
              single_select: true,
            },
          ])
        )
      );

      const { panels, warnings } = transformControlPanelsOut(controlGroupJson, 'tab-1');

      expect(panels).toHaveLength(panelCount);
      expect(warnings).toEqual([]);
    });
  });

  describe('round-trip', () => {
    const controlPanels: DiscoverSessionApiControlPanels = [
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
      const stored = serializeEsqlControls(controlPanels);
      const { panels } = transformControlPanelsOut(stored, 'tab-1');

      expect(panels).toEqual(controlPanels);
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

      const { panels: apiPanels } = transformControlPanelsOut(legacyStored, 'tab-1');
      const storedAgain = serializeEsqlControls(apiPanels);
      const { panels } = transformControlPanelsOut(storedAgain, 'tab-1');

      expect(panels).toEqual(apiPanels);
    });
  });
});
