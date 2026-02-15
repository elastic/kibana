/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EnhancedAlertEventOverview } from './enhanced_alert_event_overview';
import { ABOUT_SECTION_TEST_ID } from './test_ids';
import { useExpandSection } from '@kbn/flyout-ui';

jest.mock('@kbn/flyout-ui', () => {
  const actual = jest.requireActual('@kbn/flyout-ui');
  return {
    ...actual,
    useExpandSection: jest.fn(),
  };
});

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.uuid': '123',
  'kibana.alert.rule.description': 'Test rule description',
});

const eventHit = createMockHit({
  'event.kind': 'event',
  'event.category': 'process',
});

const mockDataView = dataViewMock;

describe('EnhancedAlertEventOverview', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('About section', () => {
    it('should render the About expandable section', () => {
      const { getByTestId } = render(
        <IntlProvider locale="en">
          <EnhancedAlertEventOverview hit={alertHit} dataView={mockDataView} />
        </IntlProvider>
      );

      expect(getByTestId(`${ABOUT_SECTION_TEST_ID}Header`)).toHaveTextContent('About');
    });

    it('should render the component collapsed if value is false in local storage', async () => {
      mockUseExpandSection.mockReturnValue(false);

      const { getByTestId } = render(
        <IntlProvider locale="en">
          <EnhancedAlertEventOverview hit={alertHit} dataView={mockDataView} />
        </IntlProvider>
      );
      await act(async () => {
        expect(getByTestId(`${ABOUT_SECTION_TEST_ID}Content`)).not.toBeVisible();
      });
    });

    it('should render the component expanded if value is true in local storage', async () => {
      mockUseExpandSection.mockReturnValue(true);

      const { getByTestId } = render(
        <IntlProvider locale="en">
          <EnhancedAlertEventOverview hit={alertHit} dataView={mockDataView} />
        </IntlProvider>
      );
      await act(async () => {
        expect(getByTestId(`${ABOUT_SECTION_TEST_ID}Content`)).toBeVisible();
      });
    });
  });

  describe('alert document', () => {
    it('should render alertOverview when hit is an alert (event.kind is signal)', () => {
      const { container } = render(
        <IntlProvider locale="en">
          <EnhancedAlertEventOverview hit={alertHit} dataView={mockDataView} />
        </IntlProvider>
      );

      const flexGroup = container.querySelector('[data-test-subj="alertOverview"]');
      expect(flexGroup).toBeInTheDocument();
    });

    it('should render AlertDescription when hit is an alert', () => {
      const { getByText } = render(
        <IntlProvider locale="en">
          <EnhancedAlertEventOverview hit={alertHit} dataView={mockDataView} />
        </IntlProvider>
      );

      expect(getByText('Rule description')).toBeInTheDocument();
      expect(getByText('Test rule description')).toBeInTheDocument();
    });
  });

  describe('non-alert document', () => {
    it('should render eventOverview when hit is not an alert (event.kind is not signal)', () => {
      const { container } = render(
        <EnhancedAlertEventOverview hit={eventHit} dataView={mockDataView} />
      );

      const flexGroup = container.querySelector('[data-test-subj="eventOverview"]');
      expect(flexGroup).toBeInTheDocument();
    });

    it('should not render AlertDescription when hit is not an alert', () => {
      const { queryByText } = render(
        <EnhancedAlertEventOverview hit={eventHit} dataView={mockDataView} />
      );

      expect(queryByText('Rule description')).not.toBeInTheDocument();
      expect(queryByText('Test rule description')).not.toBeInTheDocument();
    });

    it('should treat hit as event when event.kind is missing', () => {
      const hitWithoutEventKind = createMockHit({
        'some.other.field': 'value',
      });
      const { container, queryByText } = render(
        <EnhancedAlertEventOverview hit={hitWithoutEventKind} dataView={mockDataView} />
      );

      expect(container.querySelector('[data-test-subj="eventOverview"]')).toBeInTheDocument();
      expect(queryByText('Rule description')).not.toBeInTheDocument();
    });
  });
});
