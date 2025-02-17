/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../mock';
import { FieldBrowserModal, FieldBrowserModalProps } from './field_browser_modal';

const mockOnHide = jest.fn();
const mockOnToggleColumn = jest.fn();
const mockOnResetColumns = jest.fn();

const testProps: FieldBrowserModalProps = {
  columnIds: [],
  filteredBrowserFields: mockBrowserFields,
  searchInput: '',
  appliedFilterInput: '',
  isSearching: false,
  setSelectedCategoryIds: jest.fn(),
  onHide: mockOnHide,
  onResetColumns: mockOnResetColumns,
  onSearchInputChange: jest.fn(),
  onToggleColumn: mockOnToggleColumn,
  restoreFocusTo: React.createRef<HTMLButtonElement>(),
  selectedCategoryIds: [],
  filterSelectedEnabled: false,
  onFilterSelectedChange: jest.fn(),
};

const mountComponent = (props: Partial<FieldBrowserModalProps> = {}) =>
  mount(<FieldBrowserModal {...{ ...testProps, ...props }} />);

describe('FieldBrowserModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the Close button', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-test-subj="close"]').first().text()).toEqual('Close');
  });

  test('it invokes the Close button', () => {
    const wrapper = mountComponent();

    wrapper.find('[data-test-subj="close"]').last().simulate('click');
    expect(mockOnHide).toBeCalled();
  });

  test('it renders the Reset Fields button', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-test-subj="reset-fields"]').first().text()).toEqual('Reset Fields');
  });

  test('it invokes onResetColumns callback when the user clicks the Reset Fields button', () => {
    const wrapper = mountComponent({ columnIds: ['test'] });

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');
    expect(mockOnResetColumns).toHaveBeenCalled();
  });

  test('it invokes onHide when the user clicks the Reset Fields button', () => {
    const wrapper = mountComponent();

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');

    expect(mockOnHide).toBeCalled();
  });

  test('it renders the search', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-test-subj="field-search"]').exists()).toBe(true);
  });

  test('it renders the categories selector', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-test-subj="categories-selector"]').exists()).toBe(true);
  });

  test('it renders the fields table', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-test-subj="field-table"]').exists()).toBe(true);
  });

  test('focuses the search input when the component mounts', () => {
    const wrapper = mountComponent();

    expect(
      wrapper.find('[data-test-subj="field-search"]').first().getDOMNode().id ===
        document.activeElement?.id
    ).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the field search input', () => {
    const onSearchInputChange = jest.fn();
    const inputText = 'event.category';

    const wrapper = mountComponent({ onSearchInputChange });

    const searchField = wrapper.find('[data-test-subj="field-search"]').first();
    const changeEvent: any = { target: { value: inputText } };
    const onChange = searchField.props().onChange;

    onChange?.(changeEvent);
    searchField.simulate('change').update();

    expect(onSearchInputChange).toBeCalledWith(inputText);
  });

  test('it renders the CreateFieldButton when it is provided', () => {
    const MyTestComponent = () => <div>{'test'}</div>;

    const wrapper = mountComponent({ options: { createFieldButton: MyTestComponent } });

    expect(wrapper.find(MyTestComponent).exists()).toBeTruthy();
  });
});
