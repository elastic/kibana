/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_ESQL_OPTIONS_LIST_STATE,
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
} from '@kbn/controls-constants';
import { ESQLVariableType } from '@kbn/esql-types';
import { removeDuplicateEsqlControls } from './remove_duplicate_esql_controls';
import type { DashboardChildState, DashboardLayout } from './types';

const createControlState = (variableName: string, selectedOptions: string[] = ['US']) => ({
  ...DEFAULT_ESQL_OPTIONS_LIST_STATE,
  variable_name: variableName,
  variable_type: ESQLVariableType.VALUES,
  selected_options: selectedOptions,
});

describe('removeDuplicateEsqlControls', () => {
  const layout: DashboardLayout = {
    panels: {
      gridControl: {
        type: ESQL_CONTROL,
        grid: { w: 1, h: 1, x: 0, y: 0 },
      },
    },
    sections: {},
    pinnedPanels: {
      pinnedControl: {
        ...DEFAULT_PINNED_CONTROL_STATE,
        type: ESQL_CONTROL,
        order: 0,
      },
    },
  };

  const childState: DashboardChildState = {
    gridControl: createControlState('service_name', ['web']),
    pinnedControl: createControlState('geo_dest', ['US']),
  };

  test('drops an incoming ES|QL control whose variable is already on the dashboard', () => {
    const result = removeDuplicateEsqlControls(
      [
        {
          embeddableId: 'duplicatePinned',
          type: ESQL_CONTROL,
          serializedState: createControlState('geo_dest', ['CN']),
        },
        {
          embeddableId: 'duplicateGrid',
          type: ESQL_CONTROL,
          serializedState: createControlState('service_name', ['api']),
        },
      ],
      layout,
      childState
    );

    expect(result).toEqual([]);
  });

  test('keeps an incoming ES|QL control whose variable is not yet on the dashboard', () => {
    const incoming = [
      {
        embeddableId: 'newControl',
        type: ESQL_CONTROL,
        serializedState: createControlState('geo_src', ['FR']),
      },
    ];

    expect(removeDuplicateEsqlControls(incoming, layout, childState)).toEqual(incoming);
  });

  test('keeps a control that targets an existing panel id and prevents a later duplicate in the same batch', () => {
    const updateExisting = {
      embeddableId: 'pinnedControl',
      type: ESQL_CONTROL,
      serializedState: createControlState('host_name', ['host-1']),
    };
    const duplicateLaterInBatch = {
      embeddableId: 'duplicateHostControl',
      type: ESQL_CONTROL,
      serializedState: createControlState('host_name', ['host-2']),
    };

    expect(
      removeDuplicateEsqlControls([updateExisting, duplicateLaterInBatch], layout, childState)
    ).toEqual([updateExisting]);
  });

  test('keeps only the first control when a batch has two controls for the same new variable', () => {
    const first = {
      embeddableId: 'firstControl',
      type: ESQL_CONTROL,
      serializedState: createControlState('region', ['us-east']),
    };
    const second = {
      embeddableId: 'secondControl',
      type: ESQL_CONTROL,
      serializedState: createControlState('region', ['eu-west']),
    };

    expect(removeDuplicateEsqlControls([first, second], layout, childState)).toEqual([first]);
  });

  test('keeps packages that are not ES|QL controls', () => {
    const incoming = [
      {
        embeddableId: 'lensPanel',
        type: 'lens',
        serializedState: { title: 'Chart' },
      },
    ];

    expect(removeDuplicateEsqlControls(incoming, layout, childState)).toEqual(incoming);
  });
});
