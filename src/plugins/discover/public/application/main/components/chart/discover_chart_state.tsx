/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { assign, createMachine } from 'xstate';
import { getVisualizeInformation } from '../sidebar/lib/visualize_trigger_utils';

export type ChartOptionsMachineContext = undefined;

export interface ChartOptionsMachineState {
  value: 'inactive' | 'active';
  context: ChartOptionsMachineContext;
}

export interface ChartOptionsMachineEvent {
  type: 'TOGGLE';
}

export const chartOptionsMachine = createMachine<
  ChartOptionsMachineContext,
  ChartOptionsMachineEvent,
  ChartOptionsMachineState
  >({
  initial: 'inactive',
  states: {
    active: {
      on: {
        TOGGLE: {
          target: 'inactive',
        },
      },
    },
    inactive: {
      on: {
        TOGGLE: {
          target: 'active',
        },
      },
    },
  },
});


export function createCanVisualizeMachine(dataView: DataView, savedSearch: SavedSearch) {
  return createMachine({
    id: 'canVisualize',
    context: { canVisualize: false },
    initial: 'loading',
    states: {
      loading: {
        invoke: {
          src: 'getCanVisualize',
          onDone: {
            target: 'success',
            actions: assign({ canVisualize: (context, event) => event.data }),
          },
        },
      },
      success: {
        type: 'final',
      },
    },
  }).withConfig({
    services: {
      getCanVisualize: async () => {
        const timeField = dataView.timeFieldName && dataView.getFieldByName(dataView.timeFieldName);
        if (!timeField) {
          return false;
        }
        const result = await getVisualizeInformation(
          timeField,
          dataView.id,
          savedSearch.columns || []
        );
        return Boolean(result);
      },
    },
  });
}
