/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { SavedObjectsFindResponsePublic } from 'kibana/public';
import { StepIndexPattern } from './step_index_pattern';
import { Header } from './components/header';
import { IndexPatternCreationConfig } from '../../../../../../../plugins/index_pattern_management/public';
import { mockManagementPlugin } from '../../../../mocks';
import { canPreselectTimeField } from './utils';
import { shallow } from 'enzyme';
import { mountWithI18nProvider } from '@kbn/test/jest';
import { useIndexPattern } from './use_index_pattern';
import { MatchedItem } from '../../types';
jest.mock('./use_index_pattern');
jest.mock('../../lib/ensure_minimum_time', () => ({
  ensureMinimumTime: async (promises: Array<Promise<any>>) =>
    Array.isArray(promises) ? await Promise.all(promises) : await promises,
}));
const useIndexPatternMock = useIndexPattern as jest.Mock;
const onChangeIncludingSystemIndices = jest.fn();
const onQueryChanged = jest.fn();
const onTitleChanged = jest.fn();
const setExistingTitles = jest.fn();
const setIndexPatternName = jest.fn();
const useIndexPatternState = {
  appendedWildcard: false,
  exactMatchedIndices: [],
  existingIndexPatterns: [],
  indexPatternName: '',
  isIncludingSystemIndices: false,
  isLoadingIndices: false,
  partialMatchedIndices: [],
  patternError: false,
  selectedPatterns: [],
  title: '',
  titleError: false,
};
const useIndexPatternReturn = {
  onChangeIncludingSystemIndices,
  onQueryChanged,
  onTitleChanged,
  setExistingTitles,
  setIndexPatternName,
  state: useIndexPatternState,
};

const mockIndexPatternCreationType = new IndexPatternCreationConfig({
  type: 'default',
  name: 'name',
});

jest.mock('../../lib/get_indices', () => ({
  getIndices: ({}, {}, query: string) => {
    if (query.startsWith('e')) {
      return [{ name: 'es', item: {} }];
    }

    return [{ name: 'kibana', item: {} }];
  },
}));

const allIndices: MatchedItem[] = [
  { name: 'kibana', tags: [], item: { name: 'kibana' } },
  { name: 'es', tags: [], item: { name: 'es' } },
];

const goToNextStep = () => {};

const mockContext = mockManagementPlugin.createIndexPatternManagmentContext();
const defaultProps = {
  allIndices,
  goToNextStep,
  indexPatternCreationType: mockIndexPatternCreationType,
  showSystemIndices: false,
};

mockContext.savedObjects.client.find = async () =>
  Promise.resolve(({ savedObjects: [] } as unknown) as SavedObjectsFindResponsePublic<any>);
mockContext.uiSettings.get.mockReturnValue('');

describe('StepIndexPattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIndexPatternMock.mockReturnValue(useIndexPatternReturn);
  });
  it('renders the loading state', () => {
    useIndexPatternMock.mockReturnValue({
      ...useIndexPatternReturn,
      state: {
        ...useIndexPatternReturn.state,
        isLoadingIndices: true,
      },
    });
    const component = shallow(<StepIndexPattern {...defaultProps} />);
    expect(component.find('[data-test-subj="createIndexPatternStep1Loading"]')).toMatchSnapshot();
  });

  it('renders indices which match the initial query', async () => {
    const testProps = {
      ...defaultProps,
      initialQuery: ['kibana'],
    };
    const component = shallow(<StepIndexPattern {...testProps} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    await component.update();

    expect(
      component.find('[data-test-subj="createIndexPatternStep1IndicesList"]')
    ).toMatchSnapshot();
  });

  it('calls onQueryChanged when initialQuery input is valid', async () => {
    const initialQuery = ['k'];
    const testProps = {
      ...defaultProps,
      initialQuery,
    };
    mountWithI18nProvider(<StepIndexPattern {...testProps} />);
    expect(onQueryChanged).toHaveBeenCalledWith(initialQuery);
  });

  it('does not call onQueryChanged when initialQuery input is invalid', async () => {
    const initialQuery = ['?'];
    const testProps = {
      ...defaultProps,
      initialQuery,
    };
    mountWithI18nProvider(<StepIndexPattern {...testProps} />);
    expect(onQueryChanged).not.toHaveBeenCalled();
  });

  // TODO steph move this test to hook
  it.skip('appends a wildcard automatically to queries', async () => {
    const initialQuery = ['k'];
    const testProps = {
      ...defaultProps,
      initialQuery,
    };
    const component = mountWithI18nProvider(<StepIndexPattern {...testProps} />);
    expect(component.state('query')).toBe('k*');
  });

  it('disables the next step if the index pattern exists', async () => {
    useIndexPatternMock.mockReturnValue({
      ...useIndexPatternReturn,
      state: {
        ...useIndexPatternReturn.state,
        titleError: true,
      },
    });
    const component = shallow(<StepIndexPattern {...defaultProps} />);
    expect(component.find(Header).prop('isNextStepDisabled')).toBe(true);
  });

  // TODO steph delete this test??
  it.skip('ensures the response of the latest request is persisted', async () => {
    const component = shallow(<StepIndexPattern {...defaultProps} />);
    const instance = component.instance() as StepIndexPattern;
    instance.onQueryChanged({ target: { value: 'e' } } as React.ChangeEvent<HTMLInputElement>);
    instance.lastQuery = 'k';
    await new Promise((resolve) => process.nextTick(resolve));

    // Honesty, the state would match the result of the `k` query but
    // it's hard to mock this in tests but if remove our fix
    // (the early return if the queries do not match) then this
    // equals [{name: 'es'}]
    expect(component.state('exactMatchedIndices')).toEqual([]);

    // Ensure it works in the other code flow too (the other early return)

    // Provide `es` so we do not auto append * and enter our other code flow
    instance.onQueryChanged({ target: { value: 'es' } } as React.ChangeEvent<HTMLInputElement>);
    instance.lastQuery = 'k';
    await new Promise((resolve) => process.nextTick(resolve));
    expect(component.state('exactMatchedIndices')).toEqual([]);
  });

  it('it can preselect time field', async () => {
    const dataStream1 = {
      name: 'data stream 1',
      tags: [],
      item: { name: 'data stream 1', backing_indices: [], timestamp_field: 'timestamp_field' },
    };

    const dataStream2 = {
      name: 'data stream 2',
      tags: [],
      item: { name: 'data stream 2', backing_indices: [], timestamp_field: 'timestamp_field' },
    };

    const differentDataStream = {
      name: 'different data stream',
      tags: [],
      item: { name: 'different data stream 2', backing_indices: [], timestamp_field: 'x' },
    };

    const index = {
      name: 'index',
      tags: [],
      item: {
        name: 'index',
      },
    };

    const alias = {
      name: 'alias',
      tags: [],
      item: {
        name: 'alias',
        indices: [],
      },
    };

    expect(canPreselectTimeField([index])).toEqual(undefined);
    expect(canPreselectTimeField([alias])).toEqual(undefined);
    expect(canPreselectTimeField([index, alias, dataStream1])).toEqual(undefined);

    expect(canPreselectTimeField([dataStream1])).toEqual('timestamp_field');

    expect(canPreselectTimeField([dataStream1, dataStream2])).toEqual('timestamp_field');

    expect(canPreselectTimeField([dataStream1, dataStream2, differentDataStream])).toEqual(
      undefined
    );
  });
});
