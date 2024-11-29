/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedPanelState } from '@kbn/presentation-containers';
import type { ControlGroupSerializedState } from '@kbn/controls-plugin/common';
import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-plugin/common';

const SERIALIZED_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.controls.reactControlExample.controlGroupSerializedState';
export const WEB_LOGS_DATA_VIEW_ID = '90943e30-9a47-11e8-b64d-95841ca0b247';

export function clearControlGroupSerializedState() {
  sessionStorage.removeItem(SERIALIZED_STATE_SESSION_STORAGE_KEY);
}

export function getControlGroupSerializedState(): SerializedPanelState<ControlGroupSerializedState> {
  const serializedStateJSON = sessionStorage.getItem(SERIALIZED_STATE_SESSION_STORAGE_KEY);
  return serializedStateJSON ? JSON.parse(serializedStateJSON) : initialSerializedControlGroupState;
}

export function setControlGroupSerializedState(
  serializedState: SerializedPanelState<ControlGroupSerializedState>
) {
  sessionStorage.setItem(SERIALIZED_STATE_SESSION_STORAGE_KEY, JSON.stringify(serializedState));
}

const optionsListId = 'optionsList1';
const searchControlId = 'searchControl1';
const rangeSliderControlId = 'rangeSliderControl1';
const timesliderControlId = 'timesliderControl1';
const controlGroupPanels = {
  [rangeSliderControlId]: {
    type: RANGE_SLIDER_CONTROL,
    order: 1,
    grow: true,
    width: 'medium',
    explicitInput: {
      id: rangeSliderControlId,
      fieldName: 'bytes',
      title: 'Bytes',
      grow: true,
      width: 'medium',
      enhancements: {},
    },
  },
  [timesliderControlId]: {
    type: TIME_SLIDER_CONTROL,
    order: 4,
    grow: true,
    width: 'medium',
    explicitInput: {
      id: timesliderControlId,
      title: 'Time slider',
      enhancements: {},
    },
  },
  [optionsListId]: {
    type: OPTIONS_LIST_CONTROL,
    order: 2,
    grow: true,
    width: 'medium',
    explicitInput: {
      id: searchControlId,
      fieldName: 'agent.keyword',
      title: 'Agent',
      grow: true,
      width: 'medium',
      enhancements: {},
    },
  },
};

const initialSerializedControlGroupState = {
  rawState: {
    controlStyle: 'oneLine',
    chainingSystem: 'HIERARCHICAL',
    showApplySelections: false,
    panelsJSON: JSON.stringify(controlGroupPanels),
    ignoreParentSettingsJSON:
      '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
  } as object,
  references: [
    {
      name: `controlGroup_${rangeSliderControlId}:rangeSliderDataView`,
      type: 'index-pattern',
      id: WEB_LOGS_DATA_VIEW_ID,
    },
    {
      name: `controlGroup_${optionsListId}:optionsListDataView`,
      type: 'index-pattern',
      id: WEB_LOGS_DATA_VIEW_ID,
    },
  ],
};
