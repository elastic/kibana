/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subject } from 'rxjs';

import type {
  OptionsListControlState,
  OptionsListSelection,
  OptionsListSortingType,
  DataControlState,
} from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { SettersOf, SubjectsOf } from '@kbn/presentation-publishing/state_manager/types';
import type { DataControlApi, PublishesField } from '../types';
import type { EditorState } from './editor_state_manager';
import type { SelectionsState } from './selections_manager';
import type { TemporaryState } from './temporay_state_manager';
import type { OptionsListSuggestions } from '../../../../common/options_list';

export type OptionsListControlApi = DefaultEmbeddableApi<OptionsListControlState> &
  DataControlApi & {
    setSelectedOptions: (options: OptionsListSelection[] | undefined) => void;
    clearSelections: () => void;
    hasSelections$: PublishingSubject<boolean | undefined>;
  };

interface PublishesOptions {
  availableOptions$: PublishingSubject<OptionsListSuggestions | undefined>;
  invalidSelections$: PublishingSubject<Set<OptionsListSelection>>;
  totalCardinality$: PublishingSubject<number>;
}

/**
 * A type consisting of only the properties that the options list control puts into state managers
 * and then passes to the UI component. Excludes any managed state properties that don't end up being used
 * by the component
 */
export type OptionsListComponentState = Pick<DataControlState, 'field_name'> &
  SelectionsState &
  EditorState &
  TemporaryState & {
    sort: OptionsListSortingType | undefined;
  };

type PublishesOptionsListComponentState = SubjectsOf<OptionsListComponentState>;
type OptionsListComponentStateSetters = Partial<SettersOf<OptionsListComponentState>> &
  SettersOf<Pick<OptionsListComponentState, 'sort' | 'searchString' | 'requestSize' | 'exclude'>>;

export type OptionsListComponentApi = PublishesField &
  PublishesOptions &
  PublishesOptionsListComponentState &
  DataControlApi &
  OptionsListComponentStateSetters & {
    deselectOption: (key: string | undefined) => void;
    makeSelection: (key: string | undefined, showOnlySelected: boolean) => void;
    loadMoreSubject: Subject<void>;
    selectAll: (keys: string[]) => void;
    deselectAll: (keys: string[]) => void;
    defaultTitle$?: PublishingSubject<string | undefined>;
    uuid: string;
    allowExpensiveQueries$: PublishingSubject<boolean>;
  };

export interface OptionsListCustomStrings {
  invalidSelectionsLabel?: string;
}
