/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import {
  HasEditCapabilities,
  PublishesDataViews,
  PublishesPanelTitle,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { ControlGroupApi } from '../../control_group/types';
import { ControlFactory, DefaultControlApi, DefaultControlState } from '../types';
import { PublishesAsyncFilters } from './publishes_async_filters';

export type DataControlFieldFormatter = FieldFormatConvertFunction | ((toFormat: any) => string);

export interface PublishesField {
  field$: PublishingSubject<DataViewField | undefined>;
  fieldFormatter: PublishingSubject<DataControlFieldFormatter>;
}

export type DataControlApi = DefaultControlApi &
  Omit<PublishesPanelTitle, 'hidePanelTitle'> & // control titles cannot be hidden
  HasEditCapabilities &
  PublishesDataViews &
  PublishesField &
  PublishesAsyncFilters;

export interface CustomOptionsComponentProps<
  State extends DefaultDataControlState = DefaultDataControlState
> {
  initialState: Omit<State, 'fieldName'>;
  field: DataViewField;
  updateState: (newState: Partial<State>) => void;
  setControlEditorValid: (valid: boolean) => void;
  parentApi: ControlGroupApi;
}

export interface DataControlFactory<
  State extends DefaultDataControlState = DefaultDataControlState,
  Api extends DataControlApi = DataControlApi
> extends ControlFactory<State, Api> {
  isFieldCompatible: (field: DataViewField) => boolean;
  CustomOptionsComponent?: React.FC<CustomOptionsComponentProps<State>>;
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

export interface DataControlServices {
  core: CoreStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}
