/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiContextMenuItem } from '@elastic/eui';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { coreMock } from '@kbn/core/public/mocks';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { FieldTypeFilter, type FieldTypeFilterProps } from './field_type_filter';

const docLinks = coreMock.createStart().docLinks;

describe('UnifiedFieldList <FieldTypeFilter />', () => {
  async function openPopover(wrapper: ReactWrapper, props: FieldTypeFilterProps<DataViewField>) {
    act(() => {
      wrapper
        .find(`[data-test-subj="${props['data-test-subj']}FieldTypeFilterToggle"]`)
        .last()
        .simulate('click');
    });

    // wait for lazy modules if any
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.update();
  }

  async function toggleType(wrapper: ReactWrapper, fieldType: string) {
    act(() => {
      wrapper.find(`[data-test-subj="typeFilter-${fieldType}"]`).first().simulate('click');
    });

    await wrapper.update();
  }

  function findClearAllButton(wrapper: ReactWrapper, props: FieldTypeFilterProps<DataViewField>) {
    return wrapper.find(`[data-test-subj="${props['data-test-subj']}FieldTypeFilterClearAll"]`);
  }

  it("should render correctly and don't calculate counts unless opened", async () => {
    const props: FieldTypeFilterProps<DataViewField> = {
      selectedFieldTypes: [],
      allFields: dataView.fields,
      docLinks,
      'data-test-subj': 'filters',
      getCustomFieldType: jest.fn((field) => field.type),
      onChange: jest.fn(),
    };
    const wrapper = await mountWithIntl(<FieldTypeFilter {...props} />);
    expect(wrapper.find(EuiContextMenuItem)?.length).toBe(0);
    expect(props.getCustomFieldType).not.toBeCalled();

    await openPopover(wrapper, props);

    expect(wrapper.find(EuiContextMenuItem)?.length).toBe(10);
    expect(
      wrapper
        .find(EuiContextMenuItem)
        .map((item) => item.text())
        .join(', ')
    ).toBe(
      // format:type_icon type_name help_icon count
      'BooleanBooleanInfo1, ConflictConflictInfo1, DateDateInfo4, Geo pointGeo pointInfo2, Geo shapeGeo shapeInfo1, IP addressIP addressInfo1, KeywordKeywordInfo5, Murmur3Murmur3Info2, NumberNumberInfo3, TextTextInfo5'
    );
    expect(props.getCustomFieldType).toHaveBeenCalledTimes(props.allFields?.length ?? 0);
    expect(props.onChange).not.toBeCalled();
    expect(findClearAllButton(wrapper, props)?.length).toBe(0);
  });

  it('should exclude custom unsupported fields', async () => {
    const props: FieldTypeFilterProps<DataViewField> = {
      selectedFieldTypes: [],
      allFields: dataView.fields,
      docLinks,
      'data-test-subj': 'filters',
      onSupportedFieldFilter: (field) => ['number', 'date'].includes(field.type),
      onChange: jest.fn(),
    };
    const wrapper = await mountWithIntl(<FieldTypeFilter {...props} />);
    expect(wrapper.find(EuiContextMenuItem)?.length).toBe(0);

    await openPopover(wrapper, props);

    expect(wrapper.find(EuiContextMenuItem)?.length).toBe(2);
    expect(
      wrapper
        .find(EuiContextMenuItem)
        .map((item) => item.text())
        .join(', ')
    ).toBe('DateDateInfo4, NumberNumberInfo3');
  });

  it('should select items correctly', async () => {
    const props: FieldTypeFilterProps<DataViewField> = {
      selectedFieldTypes: ['date', 'number'],
      allFields: dataView.fields,
      docLinks,
      'data-test-subj': 'filters',
      onChange: jest.fn(),
    };
    const wrapper = await mountWithIntl(<FieldTypeFilter {...props} />);
    expect(wrapper.find(EuiContextMenuItem)?.length).toBe(0);

    await openPopover(wrapper, props);

    const clearAllButton = findClearAllButton(wrapper, props)?.first();
    expect(wrapper.find(EuiContextMenuItem)?.length).toBe(10);
    expect(clearAllButton?.length).toBe(1);
    expect(
      wrapper
        .find(EuiContextMenuItem)
        .map((item) => `${item.prop('icon')}-${item.text()}`)
        .join(', ')
    ).toBe(
      // format:selection_icon type_icon type_name help_icon count
      'empty-BooleanBooleanInfo1, empty-ConflictConflictInfo1, check-DateDateInfo4, empty-Geo pointGeo pointInfo2, empty-Geo shapeGeo shapeInfo1, empty-IP addressIP addressInfo1, empty-KeywordKeywordInfo5, empty-Murmur3Murmur3Info2, check-NumberNumberInfo3, empty-TextTextInfo5'
    );

    await toggleType(wrapper, 'boolean');

    expect(props.onChange).toHaveBeenCalledWith(['date', 'number', 'boolean']);

    await toggleType(wrapper, 'date');

    expect(props.onChange).toHaveBeenNthCalledWith(2, ['number']);

    clearAllButton.simulate('click');

    expect(props.onChange).toHaveBeenNthCalledWith(3, []);
  });
});
