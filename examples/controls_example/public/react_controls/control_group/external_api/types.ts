/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { PublishesFilters } from '@kbn/presentation-publishing';
import { Observable } from 'rxjs';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlPanelState,
  SerializedControlPanelState,
} from '../types';

export type ControlGroupRendererApi = Omit<ControlGroupApi, keyof PublishesFilters> & {
  onFiltersPublished$: Observable<Filter[]>; // filters$ -> onFiltersPublished$ to keep API consistent
};

export type AwaitingControlGroupApi = ControlGroupRendererApi | null;

export type ControlGroupRendererState = Omit<
  ControlGroupSerializedState,
  'panelsJSON' | 'ignoreParentSettingsJSON'
> & {
  id: string;
  panels: {
    [panelId: string]: ControlPanelState<SerializedControlPanelState>;
  };
  ignoreParentSettings?: ParentIgnoreSettings;
};

export interface ControlGroupSettings {
  showAddButton?: boolean;
  staticDataViewId?: string;
  editorConfig?: ControlGroupRuntimeState['editorConfig'];
}

export type FieldFilterPredicate = (f: DataViewField) => boolean;

export interface ControlGroupCreationOptions {
  initialInput?: Partial<ControlGroupRendererState>;
  settings?: ControlGroupSettings;
  fieldFilterPredicate?: FieldFilterPredicate;
}
