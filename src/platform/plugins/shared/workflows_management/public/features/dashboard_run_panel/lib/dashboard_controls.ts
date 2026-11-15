/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL, OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import {
  apiHasSerializableState,
  apiHasType,
  apiPublishesChildren,
} from '@kbn/presentation-publishing';
import type { ControlValue, DashboardControlSnapshot } from './resolve_workflow_inputs';

const CONTROL_TYPES: ReadonlySet<string> = new Set([
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  ESQL_CONTROL,
]);

interface SerializedControlState {
  title?: unknown;
  field_name?: unknown;
  variable_name?: unknown;
  selected_options?: unknown;
  value?: unknown;
  exclude?: unknown;
  exists_selected?: unknown;
}

const toMode = (state: SerializedControlState): DashboardControlSnapshot['mode'] => {
  if (state.exists_selected === true) return 'exists';
  if (state.exclude === true) return 'exclude';
  return 'include';
};

const isControlValue = (value: unknown): value is ControlValue =>
  typeof value === 'string' || typeof value === 'number';

const toValues = (value: unknown): ControlValue[] =>
  Array.isArray(value) ? value.filter(isControlValue) : [];

const toLabel = (state: SerializedControlState, id: string): string => {
  const candidates = [state.title, state.field_name, state.variable_name];
  const label = candidates.find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0
  );
  return label ?? id;
};

/**
 * Reads the current selection of every options list, range slider and ES|QL control rendered on
 * the dashboard. Controls inside collapsed sections are not rendered and are not returned.
 */
export const getDashboardControls = (parentApi: unknown): DashboardControlSnapshot[] => {
  if (!apiPublishesChildren(parentApi)) {
    return [];
  }
  return Object.entries(parentApi.children$.value).flatMap(([id, child]) => {
    if (!apiHasType(child) || !CONTROL_TYPES.has(child.type) || !apiHasSerializableState(child)) {
      return [];
    }
    const state = child.serializeState() as SerializedControlState;
    const isRange = child.type === RANGE_SLIDER_CONTROL;
    return [
      {
        id,
        label: toLabel(state, id),
        values: toValues(isRange ? state.value : state.selected_options),
        isRange,
        mode: toMode(state),
      },
    ];
  });
};
