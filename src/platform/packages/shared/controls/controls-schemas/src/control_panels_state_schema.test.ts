/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL, EsqlControlType } from '@kbn/controls-constants';
import { controlPanelsStateSchema } from './control_panels_state_schema';

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
