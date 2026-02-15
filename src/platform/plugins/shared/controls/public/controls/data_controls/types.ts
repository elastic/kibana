/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataControlState } from '@kbn/controls-schemas';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import type { HasPanelCapabilities } from '@kbn/presentation-publishing';
import type {
  AppliesFilters,
  HasEditCapabilities,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesTitle,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { StateManager } from '@kbn/presentation-publishing/state_manager/types';

import type { HasCustomPrepend } from '../types';

export type DataControlFieldFormatter = FieldFormatConvertFunction | ((toFormat: any) => string);

export interface PublishesField {
  field$: PublishingSubject<DataViewField | undefined>;
  fieldFormatter: PublishingSubject<DataControlFieldFormatter>;
}

export type DataControlApi = StateManager<DataControlState>['api'] &
  Partial<HasCustomPrepend> &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesBlockingError &
  PublishesField &
  Pick<PublishesTitle, 'defaultTitle$'> &
  PublishesDataLoading &
  AppliesFilters &
  HasPanelCapabilities & {
    setDataLoading: (loading: boolean) => void;
    setBlockingError: (error: Error | undefined) => void;
  };

export interface CustomOptionsComponentProps<State extends DataControlState = DataControlState> {
  initialState: Partial<State>;
  field?: DataViewField;
  updateState: (newState: Partial<State>) => void;
  setControlEditorValid: (valid: boolean) => void;
}

interface DataControlField {
  field: DataViewField;
  compatibleControlTypes: string[];
}

export interface DataControlFieldRegistry {
  [fieldName: string]: DataControlField;
}
