/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public/redux_embeddables/types';
import { ControlOutput } from '../../public/types';
import {
  OptionsListComponentState,
  OptionsListEmbeddableInput,
  OptionsListReduxState,
} from '../../public/options_list/types';
import { optionsListReducers } from '../../public/options_list/options_list_reducers';

const mockOptionsListComponentState = {
  field: undefined,
  totalCardinality: 0,
  availableOptions: ['woof', 'bark', 'meow', 'quack', 'moo'],
  invalidSelections: [],
  validSelections: [],
  searchString: '',
} as OptionsListComponentState;

const mockOptionsListEmbeddableInput = {
  id: 'sample options list',
  fieldName: 'sample field',
  dataViewId: 'sample id',
  selectedOptions: [],
  runPastTimeout: false,
  singleSelect: false,
} as OptionsListEmbeddableInput;

const mockOptionsListOutput = {
  loading: false,
} as ControlOutput;

export const mockOptionsListContext = (
  partialState?: Partial<OptionsListReduxState>
): ReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers> => {
  const mockReduxState = {
    componentState: {
      ...mockOptionsListComponentState,
      ...partialState?.componentState,
    },
    explicitInput: {
      ...mockOptionsListEmbeddableInput,
      ...partialState?.explicitInput,
    },
    output: {
      ...mockOptionsListOutput,
      ...partialState?.output,
    },
  } as OptionsListReduxState;

  return {
    actions: {},
    useEmbeddableDispatch: () => {},
    useEmbeddableSelector: (selector: any) => selector(mockReduxState),
  } as unknown as ReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>;
};
