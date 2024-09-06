/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { PublishingSubject } from '@kbn/presentation-publishing';
import {
  OptionsListControlState,
  OptionsListSuggestions,
} from '../../../../../common/options_list/types';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';
import { DataControlApi } from '../types';

export type OptionsListControlApi = DataControlApi;

export interface OptionsListComponentState
  extends Omit<OptionsListControlState, keyof OptionsListDisplaySettings> {
  searchString: string;
  searchStringValid: boolean;
  requestSize: number;
}

interface PublishesOptions {
  availableOptions$: PublishingSubject<OptionsListSuggestions | undefined>;
  invalidSelections$: PublishingSubject<Set<OptionsListSelection>>;
  totalCardinality$: PublishingSubject<number>;
}

export type OptionsListComponentApi = OptionsListControlApi &
  PublishesOptions & {
    deselectOption: (key: string | undefined) => void;
    makeSelection: (key: string | undefined, showOnlySelected: boolean) => void;
    loadMoreSubject: BehaviorSubject<null>;
    setExclude: (next: boolean | undefined) => void;
  };
