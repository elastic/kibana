/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FieldItemButton } from './field_item_button';

const bytesField = dataView.getFieldByName('bytes')!;
const scriptedField = dataView.getFieldByName('script date')!;
const conflictField = dataView.getFieldByName('custom_user_field')!;

describe('UnifiedFieldList <FieldItemButton />', () => {
  test('renders properly', () => {
    const component = shallow(
      <FieldItemButton
        field={bytesField}
        fieldSearchHighlight="by"
        isEmpty={false}
        isSelected={false}
        isActive={false}
        onClick={jest.fn()}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly when empty', () => {
    const component = shallow(
      <FieldItemButton
        field={scriptedField}
        fieldSearchHighlight={undefined}
        isEmpty={true}
        isSelected={true}
        isActive={false}
        onClick={jest.fn()}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly when a conflict field', () => {
    const component = shallow(
      <FieldItemButton
        field={conflictField}
        fieldSearchHighlight={undefined}
        isEmpty={false}
        isSelected={false}
        isActive={true}
        onClick={jest.fn()}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly for Records (Lens field)', () => {
    const component = shallow(
      <FieldItemButton
        field={
          new DataViewField({
            name: '___records___',
            customLabel: 'Records',
            type: 'document',
            searchable: false,
            aggregatable: true,
          })
        }
        fieldSearchHighlight="re"
        isEmpty={false}
        isSelected={false}
        isActive={true}
        onClick={jest.fn()}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly with an action when selected', () => {
    const component = shallow(
      <FieldItemButton
        field={bytesField}
        fieldSearchHighlight={undefined}
        isEmpty={false}
        isSelected={true}
        isActive={false}
        onClick={jest.fn().mockName('click')}
        onAddFieldToWorkspace={jest.fn().mockName('add')}
        onRemoveFieldFromWorkspace={jest.fn().mockName('remove')}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly with an action when deselected', () => {
    const component = shallow(
      <FieldItemButton
        field={bytesField}
        fieldSearchHighlight={undefined}
        isEmpty={false}
        isSelected={false}
        isActive={false}
        onClick={undefined}
        shouldAlwaysShowAction
        onAddFieldToWorkspace={jest.fn().mockName('add')}
        onRemoveFieldFromWorkspace={jest.fn().mockName('remove')}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly with a drag handle', () => {
    const component = shallow(
      <FieldItemButton
        size="xs"
        className="custom"
        dataTestSubj="test-subj"
        dragHandle={<span>dragHandle</span>}
        field={bytesField}
        fieldSearchHighlight={undefined}
        isEmpty={false}
        isSelected={false}
        isActive={false}
        onClick={undefined}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly for text-based column field', () => {
    const component = shallow(
      <FieldItemButton<DatatableColumn>
        field={{ id: 'test', name: 'agent', meta: { type: 'string' } }}
        fieldSearchHighlight="ag"
        getCustomFieldType={(f) => f.meta.type}
        isEmpty={false}
        isSelected={false}
        isActive={false}
        onClick={undefined}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders properly for wildcard search', () => {
    const component = shallow(
      <FieldItemButton
        field={scriptedField}
        fieldSearchHighlight="sc*te"
        isEmpty={false}
        isSelected={false}
        isActive={false}
        onClick={undefined}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
