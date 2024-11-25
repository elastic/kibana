/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiText, EuiPopoverTitle, EuiPopoverFooter } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FieldPopover } from './field_popover';
import { FieldPopoverHeader } from './field_popover_header';

describe('UnifiedFieldList <FieldPopover />', () => {
  it('should render correctly header only', async () => {
    const wrapper = mountWithIntl(
      <FieldPopover
        isOpen
        closePopover={jest.fn()}
        button={<EuiButton title="test" />}
        renderHeader={() => <EuiText>{'header'}</EuiText>}
      />
    );

    expect(wrapper.find(EuiText).text()).toBe('header');
    expect(wrapper.find(EuiPopoverTitle)).toHaveLength(0);
    expect(wrapper.find(EuiPopoverFooter)).toHaveLength(0);
  });

  it('should render correctly with header and content', async () => {
    const wrapper = mountWithIntl(
      <FieldPopover
        isOpen
        closePopover={jest.fn()}
        button={<EuiButton title="test" />}
        renderHeader={() => <EuiText>{'header'}</EuiText>}
        renderContent={() => <EuiText>{'content'}</EuiText>}
      />
    );

    expect(wrapper.find(EuiText).first().text()).toBe('header');
    expect(wrapper.find(EuiText).last().text()).toBe('content');
    expect(wrapper.find(EuiPopoverTitle)).toHaveLength(1);
  });

  it('should render nothing if popover is closed', async () => {
    const wrapper = mountWithIntl(
      <FieldPopover
        isOpen={false}
        closePopover={jest.fn()}
        button={<EuiButton title="test" />}
        renderHeader={() => <EuiText>{'header'}</EuiText>}
        renderContent={() => <EuiText>{'content'}</EuiText>}
      />
    );

    expect(wrapper.text()).toBe('');
    expect(wrapper.find(EuiPopoverTitle)).toHaveLength(0);
  });

  it('should render correctly with popover header and content', async () => {
    const mockClose = jest.fn();
    const mockEdit = jest.fn();
    const fieldName = 'extension';
    const wrapper = mountWithIntl(
      <FieldPopover
        isOpen
        closePopover={jest.fn()}
        button={<EuiButton title="test" />}
        renderHeader={() => (
          <FieldPopoverHeader
            field={dataView.fields.find((field) => field.name === fieldName)!}
            closePopover={mockClose}
            onEditField={mockEdit}
          />
        )}
        renderContent={() => <EuiText>{'content'}</EuiText>}
      />
    );

    expect(wrapper.find(EuiPopoverTitle).text()).toBe(fieldName);
    expect(wrapper.find(EuiText).last().text()).toBe('content');

    wrapper
      .find(`[data-test-subj="fieldPopoverHeader_editField-${fieldName}"]`)
      .first()
      .simulate('click');

    expect(mockClose).toHaveBeenCalled();
    expect(mockEdit).toHaveBeenCalledWith(fieldName);
  });
});
