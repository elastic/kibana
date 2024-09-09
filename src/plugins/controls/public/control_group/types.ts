/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { ContainerOutput } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';

import { ControlGroupInput, PersistableControlGroupInput } from '../../common/control_group/types';
import { TimeSlice } from '../../common/types';

export interface ControlFilterOutput {
  filters?: Filter[];
}
export interface ControlTimesliceOutput {
  timeslice?: TimeSlice;
}

export type ControlGroupFilterOutput = ControlFilterOutput & ControlTimesliceOutput;

export type ControlGroupOutput = ContainerOutput &
  ControlGroupFilterOutput & { dataViewIds: string[] };

// public only - redux embeddable state type
export type ControlGroupReduxState = ReduxEmbeddableState<
  ControlGroupInput,
  ControlGroupOutput,
  ControlGroupComponentState
>;

export type FieldFilterPredicate = (f: DataViewField) => boolean;

export interface ControlGroupCreationOptions {
  initialInput?: Partial<ControlGroupInput>;
  settings?: ControlGroupSettings;
  fieldFilterPredicate?: FieldFilterPredicate;
}

export interface ControlGroupSettings {
  showAddButton?: boolean;
  staticDataViewId?: string;
  editorConfig?: {
    hideDataViewSelector?: boolean;
    hideWidthSettings?: boolean;
    hideAdditionalSettings?: boolean;
  };
}

export type ControlGroupComponentState = ControlGroupSettings & {
  lastSavedInput?: PersistableControlGroupInput;
  lastSavedFilters?: ControlGroupFilterOutput;
  unpublishedFilters?: ControlGroupFilterOutput;
  controlWithInvalidSelectionsId?: string;
};

export {
  CONTROL_GROUP_TYPE,
  type ControlGroupInput,
  type ControlPanelState,
  type ControlsPanels,
} from '../../common/control_group/types';
