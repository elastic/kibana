/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataControlState } from '@kbn/controls-schemas';
import type { FilterableField } from '@kbn/data-source';
import type { TextContextTypeConvert } from '@kbn/field-formats-plugin/common';
import type { HasPanelCapabilities } from '@kbn/presentation-publishing';
import type {
  AppliesFilters,
  HasEditCapabilities,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataSources,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { StateManager } from '@kbn/presentation-publishing/state_manager/types';

import type { initializeLabelManager } from '../control_labels';
import type { HasCustomPrepend } from '../types';

export type DataControlFieldFormatter = TextContextTypeConvert | ((toFormat: any) => string);

export interface PublishesField {
  field$: PublishingSubject<FilterableField | undefined>;
  fieldFormatter: PublishingSubject<DataControlFieldFormatter>;
}

export type DataControlApi = StateManager<Omit<DataControlState, 'title'>>['api'] &
  Partial<HasCustomPrepend> &
  HasEditCapabilities &
  PublishesDataSources &
  PublishesBlockingError &
  PublishesField &
  PublishesDataLoading &
  AppliesFilters &
  HasPanelCapabilities &
  ReturnType<typeof initializeLabelManager>['api'] & {
    setDataLoading: (loading: boolean) => void;
    setBlockingError: (error: Error | undefined) => void;
  };

export interface CustomOptionsComponentProps<State extends DataControlState = DataControlState> {
  initialState: Partial<State>;
  field?: FilterableField;
  updateState: (newState: Partial<State>) => void;
  setControlEditorValid: (valid: boolean) => void;
}

interface DataControlField {
  field: FilterableField;
  compatibleControlTypes: string[];
}

export interface DataControlFieldRegistry {
  [fieldName: string]: DataControlField;
}
