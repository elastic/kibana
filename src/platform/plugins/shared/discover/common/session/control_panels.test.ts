/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import { convertControlGroupEntryToApi, serializeEsqlControls } from './control_panels';

describe('serializeEsqlControls', () => {
  it('maps API control_panels to stored flattened controlGroupJson', () => {
    const result = serializeEsqlControls([
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
    expect(serializeEsqlControls(undefined)).toBeUndefined();
    expect(serializeEsqlControls([])).toBeUndefined();
  });
});

describe('convertControlGroupEntryToApi', () => {
  it('converts config and removes order while leaving the legacy type for the caller to normalize', () => {
    const result = convertControlGroupEntryToApi('service-control', {
      order: 2,
      type: 'esqlControl',
      width: 'small',
      grow: false,
      controlType: 'STATIC_VALUES',
      variableName: 'service',
      variableType: 'values',
      availableOptions: ['api', 'web'],
      selectedOptions: ['api'],
      singleSelect: true,
    });

    expect(result).toStrictEqual({
      id: 'service-control',
      type: 'esqlControl',
      width: 'small',
      grow: false,
      config: {
        control_type: 'STATIC_VALUES',
        variable_name: 'service',
        variable_type: 'values',
        available_options: ['api', 'web'],
        selected_options: ['api'],
        single_select: true,
      },
    });
  });
});
