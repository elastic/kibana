/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { PublishesFilters } from '@kbn/presentation-publishing';
import { Subject } from 'rxjs';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlPanelState,
  SerializedControlPanelState,
} from '../types';

export type ControlGroupRendererApi = Omit<ControlGroupApi, keyof PublishesFilters> & {
  onFiltersPublished$: Subject<Filter[]>; // filters$ -> onFiltersPublished$ to keep API consistent
};

export type AwaitingControlGroupAPI = ControlGroupApi | null;

export type ControlGroupInput = Omit<
  ControlGroupRuntimeState,
  'initialChildControlState' | 'editorConfig'
> & {
  id: string;
  panels: {
    [panelId: string]: ControlPanelState<SerializedControlPanelState>;
  };
};

export interface ControlGroupSettings {
  showAddButton?: boolean;
  staticDataViewId?: string;
  editorConfig?: ControlGroupRuntimeState['editorConfig'];
}

export type FieldFilterPredicate = (f: DataViewField) => boolean;

export interface ControlGroupCreationOptions {
  initialInput?: ControlGroupInput;
  settings?: ControlGroupSettings;
  fieldFilterPredicate?: FieldFilterPredicate;
}
