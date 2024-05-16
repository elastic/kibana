/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { HasEditCapabilities, PublishesPanelTitle } from '@kbn/presentation-publishing';
import { PublishesDataView } from '@kbn/presentation-publishing/interfaces/publishes_data_views';
import { BehaviorSubject } from 'rxjs';
import { ControlFactory, DefaultControlApi, DefaultControlState } from '../types';

export type DataControlApi = DefaultControlApi &
  Pick<PublishesPanelTitle, 'panelTitle' | 'defaultPanelTitle'> & // does not need to be writable because control group does not have control - internally writable but not externally
  HasEditCapabilities &
  PublishesDataView;

export type DataControlStateManager<State extends object = object> = {
  [key in keyof Required<State>]: BehaviorSubject<State[key]>;
};

export interface DataControlFactory<State extends DefaultDataControlState = DefaultDataControlState>
  extends ControlFactory<State, DataControlApi> {
  isFieldCompatible: (field: DataViewField) => boolean;
  CustomOptionsComponent?: React.FC<{
    stateManager: DataControlStateManager<State>;
    setControlEditorValid: (valid: boolean) => void; // Remove?
  }>;
}

export const isDataControlFactory = (factory: unknown): factory is DataControlFactory => {
  return typeof (factory as DataControlFactory).isFieldCompatible === 'function';
};

export interface DefaultDataControlState extends DefaultControlState {
  dataViewId: string;
  fieldName: string;
  title?: string; // custom control label
}
