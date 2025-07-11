/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';

import { DataViewField } from '@kbn/data-views-plugin/common';

import type {
  OptionsListDisplaySettings,
  OptionsListSortingType,
} from '../../../../common/options_list';
import { initializeSelectionsManager } from '../options_list_control/selections_manager';
import { OptionsListComponentApi } from '../options_list_control/types';
import { initializeTemporayStateManager } from '../options_list_control/temporay_state_manager';
import { initializeEditorStateManager } from '../options_list_control/editor_state_manager';

export const getOptionsListContextMock = () => {
  const editorStateManager = initializeEditorStateManager({});
  const selectionsManager = initializeSelectionsManager({});
  const temporaryStateManager = initializeTemporayStateManager();
  const field$ = new BehaviorSubject<DataViewField | undefined>({
    type: 'string',
  } as DataViewField);
  const sort$ = new BehaviorSubject<OptionsListSortingType | undefined>(undefined);
  return {
    componentApi: {
      ...editorStateManager.api,
      ...selectionsManager.api,
      ...temporaryStateManager.api,
      uuid: 'testControl',
      field$,
      fieldName$: new BehaviorSubject<string>('field'),
      sort$,
      setSort: (next: OptionsListSortingType | undefined) => {
        sort$.next(next);
      },
      allowExpensiveQueries$: new BehaviorSubject<boolean>(true),
      fieldFormatter: new BehaviorSubject((value: string | number) => String(value)),
      makeSelection: jest.fn(),
      loadMoreSubject: new Subject<void>(),
    } as unknown as Required<OptionsListComponentApi>,
    displaySettings: {} as OptionsListDisplaySettings,
    testOnlyMethods: {
      setField: (next: DataViewField | undefined) => {
        field$.next(next);
      },
    },
  };
};
