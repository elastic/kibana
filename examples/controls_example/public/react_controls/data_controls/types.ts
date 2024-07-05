/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import {
  HasEditCapabilities,
  PublishesDataViews,
  PublishesFilters,
  PublishesPanelTitle,
} from '@kbn/presentation-publishing';
import {
  ControlFactory,
  ControlStateManager,
  DefaultControlApi,
  DefaultControlState,
} from '../types';

export type DataControlApi = DefaultControlApi &
  Omit<PublishesPanelTitle, 'hidePanelTitle'> & // control titles cannot be hidden
  HasEditCapabilities &
  PublishesDataViews &
  PublishesFilters & {
    setOutputFilter: (filter: Filter | undefined) => void; // a control should only ever output a **single** filter
  };

export interface DataControlFactory<
  State extends DefaultDataControlState = DefaultDataControlState,
  Api extends DataControlApi = DataControlApi
> extends ControlFactory<State, Api> {
  isFieldCompatible: (field: DataViewField) => boolean;
  CustomOptionsComponent?: React.FC<{
    stateManager: ControlStateManager<State>;
    setControlEditorValid: (valid: boolean) => void;
  }>;
}

export const isDataControlFactory = (
  factory: ControlFactory<object, any>
): factory is DataControlFactory<any, any> => {
  return typeof (factory as DataControlFactory).isFieldCompatible === 'function';
};

export interface DefaultDataControlState extends DefaultControlState {
  dataViewId: string;
  fieldName: string;
  title?: string; // custom control label
}
