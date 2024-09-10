/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OptionsListComponentState } from '../../public/options_list/types';
import { ControlFactory, ControlOutput } from '../../public/types';
import { OptionsListEmbeddableInput } from './types';

import * as optionsListStateModule from '../../public/options_list/options_list_reducers';
import { OptionsListEmbeddable, OptionsListEmbeddableFactory } from '../../public/options_list';

const mockOptionsListComponentState = {
  searchString: { value: '', valid: true },
  field: undefined,
  totalCardinality: 0,
  availableOptions: [
    { value: 'woof', docCount: 100 },
    { value: 'bark', docCount: 75 },
    { value: 'meow', docCount: 50 },
    { value: 'quack', docCount: 25 },
    { value: 'moo', docCount: 5 },
  ],
  invalidSelections: [],
  allowExpensiveQueries: true,
  popoverOpen: false,
  validSelections: [],
} as OptionsListComponentState;

export const mockOptionsListEmbeddableInput = {
  id: 'sample options list',
  fieldName: 'sample field',
  dataViewId: 'sample id',
  selectedOptions: [],
  runPastTimeout: false,
  singleSelect: false,
  exclude: false,
} as OptionsListEmbeddableInput;

const mockOptionsListOutput = {
  loading: false,
} as ControlOutput;

export const mockOptionsListEmbeddable = async (partialState?: {
  explicitInput?: Partial<OptionsListEmbeddableInput>;
  componentState?: Partial<OptionsListComponentState>;
}) => {
  const optionsListFactoryStub = new OptionsListEmbeddableFactory();
  const optionsListControlFactory = optionsListFactoryStub as unknown as ControlFactory;
  optionsListControlFactory.getDefaultInput = () => ({});

  // initial component state can be provided by overriding the defaults.
  const initialComponentState = {
    ...mockOptionsListComponentState,
    ...partialState?.componentState,
  };
  jest
    .spyOn(optionsListStateModule, 'getDefaultComponentState')
    .mockImplementation(() => initialComponentState);

  const mockEmbeddable = (await optionsListControlFactory.create({
    ...mockOptionsListEmbeddableInput,
    ...partialState?.explicitInput,
  })) as OptionsListEmbeddable;
  mockEmbeddable.getOutput = jest.fn().mockReturnValue(mockOptionsListOutput);
  return mockEmbeddable;
};
