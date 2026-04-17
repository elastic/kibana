/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { DEFAULT_DSL_OPTIONS_LIST_STATE, OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type {
  OptionsListDisplaySettings,
  OptionsListSortingType,
  OptionsListSelection,
} from '@kbn/controls-schemas';

import { initializeLabelManager } from '../../control_labels';
import { initializeEditorStateManager } from '../options_list_control/editor_state_manager';
import { initializeSelectionsManager } from '../options_list_control/selections_manager';
import { initializeTemporayStateManager } from '../options_list_control/temporay_state_manager';
import type { DSLOptionsListComponentApi } from '../options_list_control/types';

export const getOptionsListContextMock = () => {
  const editorStateManager = initializeEditorStateManager(DEFAULT_DSL_OPTIONS_LIST_STATE);
  const selectionsManager = initializeSelectionsManager(DEFAULT_DSL_OPTIONS_LIST_STATE);
  const temporaryStateManager = initializeTemporayStateManager<OptionsListSelection>();

  const fieldName$ = new BehaviorSubject<string>('field');
  const labelManager = initializeLabelManager(
    { title: 'Test', fieldName: 'field' },
    { fieldName$ },
    'fieldName'
  );
  const field$ = new BehaviorSubject<DataViewField | undefined>({
    type: 'string',
  } as DataViewField);
  const sort$ = new BehaviorSubject<OptionsListSortingType>(DEFAULT_DSL_OPTIONS_LIST_STATE.sort);
  return {
    componentApi: {
      type: OPTIONS_LIST_CONTROL,
      ...editorStateManager.api,
      ...selectionsManager.api,
      ...temporaryStateManager.api,
      ...labelManager.api,
      uuid: 'testControl',
      field$,
      fieldName$,
      sort$,
      setSort: (next: OptionsListSortingType) => {
        sort$.next(next);
      },
      parentApi: {},
      fieldFormatter: new BehaviorSubject((value: string | number) => String(value)),
      makeSelection: jest.fn(),
      loadMoreSubject: new Subject<void>(),
    } as unknown as Required<DSLOptionsListComponentApi>,
    displaySettings: {} as OptionsListDisplaySettings,
    testOnlyMethods: {
      setField: (next: DataViewField | undefined) => {
        field$.next(next);
      },
    },
  };
};
