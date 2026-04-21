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
  OptionsListSelection,
  OptionsListSortingType,
  DataControlState,
  OptionsListDSLControlState,
} from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasType, HasUniqueId, PublishingSubject } from '@kbn/presentation-publishing';
import type { SettersOf, SubjectsOf } from '@kbn/presentation-publishing/state_manager/types';
import type { DataControlApi, PublishesField } from '../types';
import type { EditorState } from './editor_state_manager';
import type { SelectionsState } from './selections_manager';
import type { TemporaryState } from './temporay_state_manager';
import type { OptionsListPublishesOptions, OptionsListSelectionsApi } from '../../types';

export type OptionsListControlApi = DefaultEmbeddableApi<OptionsListDSLControlState> &
  DataControlApi & {
    setSelectedOptions: (options: OptionsListSelection[]) => void;
    clearSelections: () => void;
    hasSelections$: PublishingSubject<boolean | undefined>;
  };

/**
 * A type consisting of only the properties that the options list control puts into state managers
 * and then passes to the UI component. Excludes any managed state properties that don't end up being used
 * by the component
 */
export type OptionsListComponentState = Pick<DataControlState, 'field_name'> &
  SelectionsState &
  EditorState &
  TemporaryState<OptionsListSelection> & {
    sort: OptionsListSortingType | undefined;
  };

type PublishesDSLOptionsListComponentState = SubjectsOf<
  /**
   * For API consistency, we continue to refer to the control's label as `title`; however, to avoid
   * being impacted by default embeddable title handling, we switch to `label` for the implementation
   */
  Omit<OptionsListComponentState, 'title'> & { label: string }
>;
type DSLOptionsListComponentStateSetters = SettersOf<OptionsListComponentState>;

export type DSLOptionsListComponentApi = HasType &
  HasUniqueId &
  PublishesField &
  OptionsListPublishesOptions<OptionsListSelection> &
  PublishesDSLOptionsListComponentState &
  DataControlApi &
  DSLOptionsListComponentStateSetters &
  OptionsListSelectionsApi & {
    loadMoreSubject: Subject<void>;
  };

export interface OptionsListCustomStrings {
  invalidSelectionsLabel?: string;
}
