/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { EuiLoadingSpinner, EuiNotificationBadge, EuiText } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { FieldsAccordion, FieldsAccordionProps } from './fields_accordion';
import { FieldListItem, FieldsGroupNames } from '../../types';

describe('UnifiedFieldList <FieldsAccordion />', () => {
  let defaultProps: FieldsAccordionProps<FieldListItem>;
  const paginatedFields = dataView.fields;

  beforeEach(() => {
    defaultProps = {
      initialIsOpen: true,
      onToggle: jest.fn(),
      groupIndex: 1,
      groupName: FieldsGroupNames.AvailableFields,
      id: 'id',
      label: 'label-test',
      hasLoaded: true,
      fieldsCount: paginatedFields.length,
      isFiltered: false,
      paginatedFields,
      renderCallout: () => <div id="lens-test-callout">Callout</div>,
      renderFieldItem: ({ field, fieldSearchHighlight }) => (
        <EuiText key={field.name} data-highlight={fieldSearchHighlight}>
          {field.name}
        </EuiText>
      ),
    };
  });

  it('renders fields correctly', () => {
    const wrapper = mountWithIntl(<FieldsAccordion {...defaultProps} />);
    expect(wrapper.find(EuiText)).toHaveLength(paginatedFields.length + 1); // + title
    expect(wrapper.find(EuiText).first().text()).toBe(defaultProps.label);
    expect(wrapper.find(EuiText).at(1).text()).toBe(paginatedFields[0].name);
    expect(wrapper.find(EuiText).last().text()).toBe(
      paginatedFields[paginatedFields.length - 1].name
    );
  });

  it('renders callout if no fields', () => {
    const wrapper = mountWithIntl(
      <FieldsAccordion {...defaultProps} fieldsCount={0} paginatedFields={[]} />
    );
    expect(wrapper.find('#lens-test-callout').length).toEqual(1);
  });

  it('renders accented notificationBadge state if isFiltered', () => {
    const wrapper = mountWithIntl(<FieldsAccordion {...defaultProps} isFiltered={true} />);
    expect(wrapper.find(EuiNotificationBadge).prop('color')).toEqual('accent');
  });

  it('renders spinner if has not loaded', () => {
    const wrapper = mountWithIntl(<FieldsAccordion {...defaultProps} hasLoaded={false} />);
    expect(wrapper.find(EuiLoadingSpinner).length).toEqual(1);
  });

  it('renders items with the provided highlight', () => {
    const wrapperWithHighlight = mountWithIntl(
      <FieldsAccordion {...defaultProps} fieldSearchHighlight="test-highlight" />
    );
    expect(wrapperWithHighlight.find(EuiText).last().prop('data-highlight')).toBe('test-highlight');

    const wrapperWithoutHighlight = mountWithIntl(<FieldsAccordion {...defaultProps} />);
    expect(wrapperWithoutHighlight.find(EuiText).last().prop('data-highlight')).toBeUndefined();
  });
});
