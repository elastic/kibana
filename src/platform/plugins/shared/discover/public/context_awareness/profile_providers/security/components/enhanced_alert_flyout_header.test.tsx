/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EnhancedAlertFlyoutHeader } from './enhanced_alert_flyout_header';
import type { ProfileProviderServices } from '../../profile_provider_services';

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

describe('EnhancedAlertFlyoutHeader', () => {
  it('renders the security solution header feature', () => {
    const renderHeaderFeature = jest.fn().mockReturnValue(<div>Header</div>);
    const providerServices = {
      discoverShared: {
        features: {
          registry: {
            getById: jest.fn().mockReturnValue({
              id: 'security-solution-alert-flyout-header-title',
              renderHeader: renderHeaderFeature,
            }),
          },
        },
      },
    } as unknown as ProfileProviderServices;

    render(
      <IntlProvider locale="en">
        <EnhancedAlertFlyoutHeader
          hit={hit}
          dataView={dataViewMock}
          providerServices={providerServices}
        />
      </IntlProvider>
    );

    expect(renderHeaderFeature).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        dataView: dataViewMock,
        onAlertUpdated: expect.any(Function),
      })
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('falls back to the previous renderHeader when feature is unavailable', () => {
    const fallbackRenderHeader = jest.fn().mockReturnValue(<div>Fallback Header</div>);
    const providerServices = {
      discoverShared: {
        features: {
          registry: {
            getById: jest.fn().mockReturnValue(undefined),
          },
        },
      },
    } as unknown as ProfileProviderServices;

    render(
      <IntlProvider locale="en">
        <EnhancedAlertFlyoutHeader
          hit={hit}
          dataView={dataViewMock}
          providerServices={providerServices}
          fallbackRenderHeader={fallbackRenderHeader}
        />
      </IntlProvider>
    );

    expect(fallbackRenderHeader).toHaveBeenCalled();
    expect(screen.getByText('Fallback Header')).toBeInTheDocument();
  });
});
