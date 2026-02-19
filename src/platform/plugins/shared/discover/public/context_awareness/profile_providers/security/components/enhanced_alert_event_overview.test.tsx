/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EnhancedAlertEventOverview } from './enhanced_alert_event_overview';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

jest.mock('../../../../hooks/use_discover_services');

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
    const renderFeature = jest.fn().mockResolvedValue(() => <div>OverviewTab</div>);
    const mockDiscoverServices = {
      discoverShared: {
        features: {
          registry: {
            getById: jest.fn().mockReturnValue({
              id: 'security-solution-alert-flyout-overview-tab',
              render: renderFeature,
            }),
          },
        },
      },
    };

    (useDiscoverServices as jest.Mock).mockReturnValue(mockDiscoverServices);

    render(
      <IntlProvider locale="en">
        <EnhancedAlertEventOverview hit={hit} dataView={dataViewMock} />
      </IntlProvider>
    );

    await waitFor(() => expect(renderFeature).toHaveBeenCalledWith(hit));
    await act(async () => {
      await renderFeature.mock.results[0].value;
    });

    expect(screen.getByText('OverviewTab')).toBeInTheDocument();
  });
});
