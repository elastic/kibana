/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { DSLOptionsListComponentApi } from './data_controls/options_list_control/types';
import type { ESQLOptionsListComponentApi } from './esql_control/types';
import type { OptionsListSuggestions } from '../../common/options_list';

export interface HasCustomPrepend {
  CustomPrependComponent: React.FC<{}>;
}

/**
 * These types are shared between normal options list controls and ES|QL controls
 */

export type OptionsListComponentApi = DSLOptionsListComponentApi | ESQLOptionsListComponentApi;

export interface OptionsListSelectionsApi {
  makeSelection: (key: string | undefined, showOnlySelected: boolean) => void;
  deselectOption: (key: string | undefined) => void;
  selectAll: (keys: string[]) => void;
  deselectAll: (keys: string[]) => void;
}

export interface OptionsListPublishesOptions<SelectionType> {
  availableOptions$: PublishingSubject<OptionsListSuggestions<SelectionType>>;
  invalidSelections$: PublishingSubject<Set<SelectionType>>;
  totalCardinality$: PublishingSubject<number>;
}
