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
import { FieldsAccordion } from './fields_accordion';
import { FieldsGroupNames } from '../../types';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiNotificationBadge } from '@elastic/eui';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiNotificationBadge: jest.fn(() => <div>MockBadge</div>),
}));
const MockEuiNotificationBadge = jest.mocked(EuiNotificationBadge);

beforeEach(() => {
  MockEuiNotificationBadge.mockImplementation((props) => (
    <div data-test-subj={props['data-test-subj']} />
  ));
});

const setup = (props: Partial<React.ComponentProps<typeof FieldsAccordion>> = {}) => {
  const propsToUse: React.ComponentProps<typeof FieldsAccordion> = {
    initialIsOpen: true,
    onToggle: jest.fn(),
    groupIndex: 1,
    groupName: FieldsGroupNames.AvailableFields,
    id: 'id',
    buttonId: 'button-id',
    label: 'label-test',
    hasLoaded: true,
    fieldsCount: dataView.fields.length,
    paginatedFields: dataView.fields,
    isFiltered: false,
    extraAction: null,
    renderCallout: () => <div id="lens-test-callout">Callout</div>,
    renderFieldItem: ({ field, fieldSearchHighlight }) => (
      <div key={field.name} data-highlight={fieldSearchHighlight}>
        {field.name}
      </div>
    ),
    ...props,
  };

  render(
    <IntlProvider>
      <FieldsAccordion {...propsToUse} />
    </IntlProvider>
  );

  return { props: propsToUse };
};

describe('UnifiedFieldList <FieldsAccordion />', () => {
  it('renders fields correctly', () => {
    const { props } = setup();

    for (const field of props.paginatedFields) {
      expect(screen.getByText(field.name)).toBeVisible();
    }

    expect(screen.getByText(props.label)).toBeVisible();
    expect(screen.getByText(dataView.fields[0].name)).toBeVisible();
    expect(screen.getByText(dataView.fields[dataView.fields.length - 1].name)).toBeVisible();
  });

  describe('when there are no fields', () => {
    it('should render the callout', () => {
      setup({
        paginatedFields: [],
        fieldsCount: 0,
        renderCallout: () => <div>There are no items</div>,
      });

      expect(screen.getByText('There are no items')).toBeVisible();
    });
  });

  describe('when the accordion is filtered', () => {
    it('should render the notification badge with accent color', () => {
      setup({ isFiltered: true });

      expect(screen.getByTestId('id-count')).toBeVisible();
      expect(MockEuiNotificationBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'accent',
        }),
        {}
      );
    });
  });

  describe('when the accordion is not filtered', () => {
    it('should render the notification badge with subdued color', () => {
      setup({ isFiltered: false });

      expect(screen.getByTestId('id-count')).toBeVisible();
      expect(MockEuiNotificationBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'subdued',
        }),
        {}
      );
    });
  });

  describe('when it is loading', () => {
    it('should render the loading spinner', () => {
      setup({ hasLoaded: false });

      expect(screen.getByTestId('id-countLoading')).toBeVisible();
    });
  });

  describe('given a search highlight', () => {
    it('should apply the highlight to the field items', () => {
      const highlight = 'test-highlight';
      setup({
        fieldSearchHighlight: highlight,
      });

      expect(screen.getByText(dataView.fields[0].name)).toHaveAttribute(
        'data-highlight',
        highlight
      );
    });
  });

  describe('given an extra action', () => {
    it('should render the extra action', () => {
      const extraAction = <div data-test-subj="extra-action">Extra Action</div>;
      setup({ extraAction });

      expect(screen.getByTestId('extra-action')).toBeVisible();
    });
  });
});
