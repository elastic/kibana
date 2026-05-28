/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ESQL_CONTROL,
  EsqlControlType,
  MAX_CONTROL_PANEL_ID_LENGTH,
  MAX_ESQL_CONTROL_QUERY_LENGTH,
} from '@kbn/controls-constants';
import { controlPanelsStateSchema } from './control_panels_state_schema';

const validEsqlControlPanel = {
  type: ESQL_CONTROL,
  order: 0,
  width: 'medium' as const,
  grow: false,
  control_type: EsqlControlType.STATIC_VALUES,
  available_options: ['a', 'b'],
  selected_options: [],
  single_select: true,
  variable_name: 'region',
  variable_type: 'values',
};

describe('controlPanelsStateSchema', () => {
  it('validates ES|QL control panels', () => {
    expect(
      controlPanelsStateSchema.validate({
        'panel-1': {
          type: ESQL_CONTROL,
          order: 0,
          width: 'medium',
          grow: false,
          control_type: EsqlControlType.STATIC_VALUES,
          available_options: ['a', 'b'],
          selected_options: [],
          single_select: true,
          variable_name: 'region',
          variable_type: 'values',
        },
      })
    ).toMatchObject({
      'panel-1': {
        type: ESQL_CONTROL,
        control_type: EsqlControlType.STATIC_VALUES,
      },
    });
  });

  it('rejects ES|QL panels with an invalid control_type variant', () => {
    expect(() =>
      controlPanelsStateSchema.validate({
        'panel-1': {
          type: ESQL_CONTROL,
          order: 0,
          width: 'medium',
          grow: false,
          control_type: EsqlControlType.STATIC_VALUES,
          selected_options: [],
          single_select: true,
          variable_name: 'region',
          variable_type: 'values',
        },
      })
    ).toThrow();
  });

  it('rejects empty panel IDs', () => {
    expect(() =>
      controlPanelsStateSchema.validate({
        '': validEsqlControlPanel,
      })
    ).toThrow();
  });

  it('rejects panel IDs that exceed the maximum length', () => {
    const panelId = 'a'.repeat(MAX_CONTROL_PANEL_ID_LENGTH + 1);

    expect(() =>
      controlPanelsStateSchema.validate({
        [panelId]: validEsqlControlPanel,
      })
    ).toThrow();
  });

  it('rejects ES|QL queries that exceed the maximum length', () => {
    expect(() =>
      controlPanelsStateSchema.validate({
        'panel-1': {
          ...validEsqlControlPanel,
          control_type: EsqlControlType.VALUES_FROM_QUERY,
          esql_query: 'a'.repeat(MAX_ESQL_CONTROL_QUERY_LENGTH + 1),
        },
      })
    ).toThrow();
  });

  it('validates options list control panels', () => {
    expect(
      controlPanelsStateSchema.validate({
        'panel-1': {
          type: 'options_list_control',
          order: 0,
          width: 'medium',
          grow: false,
          data_view_id: 'logs-data-view',
          field_name: 'host.name',
          selected_options: [],
          single_select: false,
          use_global_filters: true,
          ignore_validations: false,
          exclude: false,
          exists_selected: false,
          run_past_timeout: false,
          search_technique: 'wildcard',
          sort: { by: '_count', direction: 'desc' },
        },
      })
    ).toMatchObject({
      'panel-1': {
        type: 'options_list_control',
      },
    });
  });
});
