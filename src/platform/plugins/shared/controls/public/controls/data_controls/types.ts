/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import {
  HasEditCapabilities,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesFilters,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { DefaultDataControlState } from '../../../common';
import { ControlGroupApi } from '../../control_group/types';

export type DataControlFieldFormatter = FieldFormatConvertFunction | ((toFormat: any) => string);

export interface PublishesField {
  field$: PublishingSubject<DataViewField | undefined>;
  fieldFormatter: PublishingSubject<DataControlFieldFormatter>;
}

export type DataControlApi = HasEditCapabilities &
  PublishesDataViews &
  PublishesBlockingError &
  PublishesField &
  PublishesDataLoading &
  PublishesFilters & {
    setDataLoading: (loading: boolean) => void;
    setBlockingError: (error: Error | undefined) => void;
  };

export interface CustomOptionsComponentProps<
  State extends DefaultDataControlState = DefaultDataControlState
> {
  initialState: Partial<State>;
  field: DataViewField;
  updateState: (newState: Partial<State>) => void;
  setControlEditorValid: (valid: boolean) => void;
  controlGroupApi: ControlGroupApi;
}

interface DataControlField {
  field: DataViewField;
  compatibleControlTypes: string[];
}

export interface DataControlFieldRegistry {
  [fieldName: string]: DataControlField;
}
