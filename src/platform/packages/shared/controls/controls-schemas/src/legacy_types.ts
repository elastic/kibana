/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';

/**
 * These values only exist for control saved objects prior to version 9.4.
 * They should remain isolated and not rely on other imported types, since
 * they should never change.
 */

export interface LegacyStoredPinnedControlState {
  [id: string]: {
    type: string;
    order: number; // order is generated from the array order of the API schema
    width?: string;
    grow?: boolean;
    explicitInput:
      | LegacyStoredOptionsListExplicitInput
      | LegacyStoredRangeSliderExplicitInput
      | LegacyStoredRangeSliderExplicitInput
      | LegacyStoredTimeSliderExplicitInput;
  };
}

export interface LegacyStoredDataControlState extends SerializedTitles {
  fieldName: string;
  useGlobalFilters?: boolean;
  ignoreValidations?: boolean;
  dataViewRefName?: string;
}

export type LegacyStoredOptionsListExplicitInput = LegacyStoredDataControlState & {
  displaySettings?: {
    placeholder?: string;
    hideActionBar?: boolean;
    hideExclude?: boolean;
    hideExists?: boolean;
    hideSort?: boolean;
  };
  exclude?: boolean;
  existsSelected?: boolean;
  runPastTimeout?: boolean;
  searchTechnique?: string;
  selectedOptions?: Array<string | number>;
  singleSelect?: boolean;
  sort?: { by: string; direction: string };
};

export type LegacyStoredRangeSliderExplicitInput = LegacyStoredDataControlState & {
  step?: number;
  value?: [string, string];
};

export interface LegacyStoredESQLControlExplicitInput {
  availableOptions?: string[];
  controlType: string;
  displaySettings?: {
    placeholder?: string;
    hideActionBar?: boolean;
    hideExclude?: boolean;
    hideExists?: boolean;
    hideSort?: boolean;
  };
  esqlQuery: string;
  selectedOptions: string[];
  singleSelect?: boolean;
  variableName: string;
  variableType: string;
}

export interface LegacyStoredTimeSliderExplicitInput {
  isAnchored?: boolean;
  timesliceEndAsPercentageOfTimeRange?: number;
  timesliceStartAsPercentageOfTimeRange?: number;
}

export interface LegacyIgnoreParentSettings {
  ignoreFilters?: boolean;
  ignoreQuery?: boolean;
  ignoreTimerange?: boolean;
  ignoreValidations?: boolean;
}
