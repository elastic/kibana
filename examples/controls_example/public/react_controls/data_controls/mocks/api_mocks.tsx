/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { OptionsListSuggestions } from '@kbn/controls-plugin/common/options_list/types';
import { DataViewField } from '@kbn/data-views-plugin/common';

import { OptionsListSelection } from '../../../../common/options_list/options_list_selections';
import { OptionsListSearchTechnique } from '../../../../common/options_list/suggestions_searching';
import { OptionsListSortingType } from '../../../../common/options_list/suggestions_sorting';
import { OptionsListDisplaySettings } from '../options_list_control/types';

export const getOptionsListMocks = () => {
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
    },
    stateManager: {
      searchString: new BehaviorSubject<string>(''),
      searchStringValid: new BehaviorSubject<boolean>(true),
      fieldName: new BehaviorSubject<string>('field'),
      exclude: new BehaviorSubject<boolean | undefined>(undefined),
      existsSelected: new BehaviorSubject<boolean | undefined>(undefined),
      sort: new BehaviorSubject<OptionsListSortingType | undefined>(undefined),
      selectedOptions: new BehaviorSubject<OptionsListSelection[] | undefined>(undefined),
      searchTechnique: new BehaviorSubject<OptionsListSearchTechnique | undefined>(undefined),
    },
    displaySettings: {} as OptionsListDisplaySettings,
  };
};
