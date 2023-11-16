/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { ContainerOutput } from '@kbn/embeddable-plugin/public';
import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { ControlGroupInput } from '../../common/control_group/types';
import { CommonControlOutput } from '../types';

export type ControlGroupOutput = ContainerOutput &
  Omit<CommonControlOutput, 'dataViewId'> & { dataViewIds: string[] };

// public only - redux embeddable state type
export type ControlGroupReduxState = ReduxEmbeddableState<
  ControlGroupInput,
  ControlGroupOutput,
  ControlGroupSettings
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

export {
  type ControlsPanels,
  type ControlGroupInput,
  type ControlPanelState,
  CONTROL_GROUP_TYPE,
} from '../../common/control_group/types';
