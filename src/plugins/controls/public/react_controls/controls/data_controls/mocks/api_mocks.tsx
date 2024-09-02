/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { DataViewField } from '@kbn/data-views-plugin/common';

import { PublishingSubject } from '@kbn/presentation-publishing';
import { OptionsListSuggestions } from '../../../../../common/options_list/types';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';
import { OptionsListSearchTechnique } from '../../../../../common/options_list/suggestions_searching';
import { OptionsListSortingType } from '../../../../../common/options_list/suggestions_sorting';
import { OptionsListDisplaySettings } from '../options_list_control/types';

export const getOptionsListMocks = () => {
  const selectedOptions$ = new BehaviorSubject<OptionsListSelection[] | undefined>(undefined);
  const exclude$ = new BehaviorSubject<boolean | undefined>(undefined);
  const existsSelected$ = new BehaviorSubject<boolean | undefined>(undefined);
  return {
    api: {
      uuid: 'testControl',
      field$: new BehaviorSubject<DataViewField | undefined>({ type: 'string' } as DataViewField),
      availableOptions$: new BehaviorSubject<OptionsListSuggestions | undefined>(undefined),
      invalidSelections$: new BehaviorSubject<Set<OptionsListSelection>>(new Set([])),
      totalCardinality$: new BehaviorSubject<number | undefined>(undefined),
      dataLoading: new BehaviorSubject<boolean>(false),
      parentApi: {
        allowExpensiveQueries$: new BehaviorSubject<boolean>(true),
      },
      fieldFormatter: new BehaviorSubject((value: string | number) => String(value)),
      makeSelection: jest.fn(),
      setExclude: (next: boolean | undefined) => exclude$.next(next),
    },
    stateManager: {
      searchString: new BehaviorSubject<string>(''),
      searchStringValid: new BehaviorSubject<boolean>(true),
      fieldName: new BehaviorSubject<string>('field'),
      exclude: exclude$ as PublishingSubject<boolean | undefined>,
      existsSelected: existsSelected$ as PublishingSubject<boolean | undefined>,
      sort: new BehaviorSubject<OptionsListSortingType | undefined>(undefined),
      selectedOptions: selectedOptions$ as PublishingSubject<OptionsListSelection[] | undefined>,
      searchTechnique: new BehaviorSubject<OptionsListSearchTechnique | undefined>(undefined),
    },
    displaySettings: {} as OptionsListDisplaySettings,
    // setSelectedOptions and setExistsSelected are not exposed via API because
    // they are not used by components
    // they are needed in tests however so expose them as top level keys
    setSelectedOptions: (next: OptionsListSelection[] | undefined) => selectedOptions$.next(next),
    setExistsSelected: (next: boolean | undefined) => existsSelected$.next(next),
  };
};
