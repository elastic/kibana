/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EnhancedAlertEventOverview } from './enhanced_alert_event_overview';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const hit = createMockHit({
  'event.kind': 'signal',
});

describe('EnhancedAlertEventOverview', () => {
  it('renders the security solution overview tab feature', async () => {
    const renderFeature = jest.fn().mockReturnValue(<div>OverviewTab</div>);
    const overviewTab = {
      id: 'security-solution-alert-flyout-overview-tab' as const,
      render: renderFeature,
    };

    render(
      <IntlProvider locale="en">
        <EnhancedAlertEventOverview hit={hit} dataView={dataViewMock} overviewTab={overviewTab} />
      </IntlProvider>
    );

    await waitFor(() =>
      expect(renderFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          hit,
          dataView: dataViewMock,
          onAlertUpdated: expect.any(Function),
        })
      )
    );

    expect(screen.getByText('OverviewTab')).toBeInTheDocument();
  });

  it('forwards the restorable doc view state to the overview tab feature', () => {
    const renderFeature = jest.fn().mockReturnValue(<div>OverviewTab</div>);
    const initialState = { flyoutV2: [{ kind: 'host', hostName: 'web-01' }] };
    const onInitialStateChange = jest.fn();

    render(
      <IntlProvider locale="en">
        <EnhancedAlertEventOverview
          hit={hit}
          dataView={dataViewMock}
          overviewTab={{ id: 'security-solution-alert-flyout-overview-tab', render: renderFeature }}
          initialState={initialState}
          onInitialStateChange={onInitialStateChange}
        />
      </IntlProvider>
    );

    expect(renderFeature).toHaveBeenCalledWith(
      expect.objectContaining({ initialState, onInitialStateChange })
    );
  });

  it('renders nothing when the overview tab feature is not registered', () => {
    const { container } = render(
      <IntlProvider locale="en">
        <EnhancedAlertEventOverview hit={hit} dataView={dataViewMock} />
      </IntlProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
