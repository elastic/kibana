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
import { EnhancedIOCFlyoutFooter } from './enhanced_ioc_flyout_footer';
import type { ProfileProviderServices } from '../../profile_provider_services';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const hit = createMockHit({
  'threat.indicator.type': 'file',
});

describe('EnhancedIOCFlyoutFooter', () => {
  it('renders the security solution ioc footer feature', () => {
    const renderFooterFeature = jest.fn().mockReturnValue(<div>IOC Footer</div>);
    const providerServices = {
      discoverShared: {
        features: {
          registry: {
            getById: jest.fn().mockReturnValue({
              id: 'security-solution-ioc-flyout-footer',
              renderFooter: renderFooterFeature,
            }),
          },
        },
      },
    } as unknown as ProfileProviderServices;

    render(
      <IntlProvider locale="en">
        <EnhancedIOCFlyoutFooter
          hit={hit}
          dataView={dataViewMock}
          providerServices={providerServices}
        />
      </IntlProvider>
    );

    expect(renderFooterFeature).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        dataView: dataViewMock,
      })
    );
    expect(screen.getByText('IOC Footer')).toBeInTheDocument();
  });

  it('falls back to the previous renderFooter when feature is unavailable', () => {
    const fallbackRenderFooter = jest.fn().mockReturnValue(<div>Fallback Footer</div>);
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
        <EnhancedIOCFlyoutFooter
          hit={hit}
          dataView={dataViewMock}
          providerServices={providerServices}
          fallbackRenderFooter={fallbackRenderFooter}
        />
      </IntlProvider>
    );

    expect(fallbackRenderFooter).toHaveBeenCalled();
    expect(screen.getByText('Fallback Footer')).toBeInTheDocument();
  });
});
