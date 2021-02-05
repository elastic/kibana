/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject } from '@elastic/eui/lib/test';
import { DiscoverFieldSearch, Props } from './discover_field_search';
import { EuiButtonGroupProps, EuiPopover } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';

describe('DiscoverFieldSearch', () => {
  const defaultProps = {
    onChange: jest.fn(),
    value: 'test',
    types: ['any', 'string', '_source'],
  };

  function mountComponent(props?: Props) {
    const compProps = props || defaultProps;
    return mountWithIntl(<DiscoverFieldSearch {...compProps} />);
  }

  function findButtonGroup(component: ReactWrapper, id: string) {
    return component.find(`[data-test-subj="${id}ButtonGroup"]`).first();
  }

  test('enter value', () => {
    const component = mountComponent();
    const input = findTestSubject(component, 'fieldFilterSearchInput');
    input.simulate('change', { target: { value: 'new filter' } });
    expect(defaultProps.onChange).toBeCalledTimes(1);
  });

  test('change in active filters should change facet selection and call onChange', () => {
    const onChange = jest.fn();
    const component = mountComponent({ ...defaultProps, ...{ onChange } });
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    const badge = btn.find('.euiNotificationBadge');
    expect(badge.text()).toEqual('0');
    btn.simulate('click');
    const aggregatableButtonGroup = findButtonGroup(component, 'aggregatable');

    act(() => {
      // @ts-ignore
      (aggregatableButtonGroup.props() as EuiButtonGroupProps).onChange('aggregatable-true', null);
    });
    component.update();
    expect(badge.text()).toEqual('1');
    expect(onChange).toBeCalledWith('aggregatable', true);
  });

  test('change in active filters should change filters count', () => {
    const component = mountComponent();
    let btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    btn = findTestSubject(component, 'toggleFieldFilterButton');
    const badge = btn.find('.euiNotificationBadge');
    // no active filters
    expect(badge.text()).toEqual('0');
    // change value of aggregatable select
    const aggregatableButtonGroup = findButtonGroup(component, 'aggregatable');
    act(() => {
      // @ts-ignore
      (aggregatableButtonGroup.props() as EuiButtonGroupProps).onChange('aggregatable-true', null);
    });
    component.update();
    expect(badge.text()).toEqual('1');
    // change value of searchable select
    const searchableButtonGroup = findButtonGroup(component, 'searchable');
    act(() => {
      // @ts-ignore
      (searchableButtonGroup.props() as EuiButtonGroupProps).onChange('searchable-true', null);
    });
    component.update();
    expect(badge.text()).toEqual('2');
    // change value of searchable select
    act(() => {
      // @ts-ignore
      (searchableButtonGroup.props() as EuiButtonGroupProps).onChange('searchable-any', null);
    });
    component.update();
    expect(badge.text()).toEqual('1');
  });

  test('change in missing fields switch should not change filter count', () => {
    const component = mountComponent();
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    const badge = btn.find('.euiNotificationBadge');
    expect(badge.text()).toEqual('0');
    const missingSwitch = findTestSubject(component, 'missingSwitch');
    missingSwitch.simulate('change', { target: { value: false } });
    expect(badge.text()).toEqual('0');
  });

  test('change in filters triggers onChange', () => {
    const onChange = jest.fn();
    const component = mountComponent({ ...defaultProps, ...{ onChange } });
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    const aggregtableButtonGroup = findButtonGroup(component, 'aggregatable');
    const missingSwitch = findTestSubject(component, 'missingSwitch');
    act(() => {
      // @ts-ignore
      (aggregtableButtonGroup.props() as EuiButtonGroupProps).onChange('aggregatable-true', null);
    });
    missingSwitch.simulate('click');
    expect(onChange).toBeCalledTimes(2);
  });

  test('change in type filters triggers onChange with appropriate value', () => {
    const onChange = jest.fn();
    const component = mountComponent({ ...defaultProps, ...{ onChange } });
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    const typeSelector = findTestSubject(component, 'typeSelect');
    typeSelector.simulate('change', { target: { value: 'string' } });
    expect(onChange).toBeCalledWith('type', 'string');
    typeSelector.simulate('change', { target: { value: 'any' } });
    expect(onChange).toBeCalledWith('type', 'any');
  });

  test('click on filter button should open and close popover', () => {
    const component = mountComponent();
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    let popover = component.find(EuiPopover);
    expect(popover.prop('isOpen')).toBe(true);
    btn.simulate('click');
    popover = component.find(EuiPopover);
    expect(popover.prop('isOpen')).toBe(false);
  });

  test('unmapped fields', () => {
    const onChangeUnmappedFields = jest.fn();
    const componentProps = {
      ...defaultProps,
      showUnmappedFields: true,
      useNewFieldsApi: false,
      onChangeUnmappedFields,
    };
    const component = mountComponent(componentProps);
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    const unmappedFieldsSwitch = findTestSubject(component, 'unmappedFieldsSwitch');
    act(() => {
      unmappedFieldsSwitch.simulate('click');
    });
    expect(onChangeUnmappedFields).toHaveBeenCalledWith(false);
  });
});
