/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import {
  EIS_CALLOUT_TITLE,
  EIS_CLOUD_CONNECT_PROMO_DESCRIPTION,
  EIS_CLOUD_CONNECT_PROMO_TOUR_CTA,
} from '../translations';
import {
  EisCloudConnectPromoCallout,
  type EisCloudConnectPromoCalloutProps,
} from './eis_ccm_promotional_callout';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_show_eis_promotional_content');
jest.mock('../hooks/use_kibana');

const mockUiSettingsGet = jest.fn();
const mockNavigateToApp = jest.fn();
const mockOnDismissPromo = jest.fn();

const mockUseKibana = (overrides?: Partial<any>) => {
  (useKibana as jest.Mock).mockReturnValue({
    services: {
      uiSettings: {
        get: mockUiSettingsGet,
      },
      application: {
        navigateToApp: mockNavigateToApp,
        capabilities: {
          cloudConnect: {
            show: true,
            configure: true,
          },
        },
      },
      ...overrides,
    },
  });
};

describe('EisCloudConnectPromoCallout', () => {
  const promoId = 'testPromo';
  const dataId = `${promoId}-cloud-connect-callout`;
  const direction: EisCloudConnectPromoCalloutProps['direction'] = 'row';

  const renderComponent = (props?: Partial<EisCloudConnectPromoCalloutProps>) =>
    render(
      <EuiThemeProvider>
        <EisCloudConnectPromoCallout
          promoId={promoId}
          isSelfManaged={true}
          navigateToApp={mockNavigateToApp}
          direction={direction}
          {...props}
        />
      </EuiThemeProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUiSettingsGet.mockReturnValue(true);
    mockUseKibana();
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: mockOnDismissPromo,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders callout when promo is visible and deployment is self-managed', () => {
    renderComponent();

    // Callout exists
    const callout = screen.getByTestId(dataId);
    expect(callout).toBeInTheDocument();

    // Title, description, CTA, and image
    expect(screen.getByText(EIS_CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(EIS_CLOUD_CONNECT_PROMO_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByText(EIS_CLOUD_CONNECT_PROMO_TOUR_CTA)).toBeInTheDocument();
  });

  it('calls onDismissPromo when dismiss button is clicked', () => {
    renderComponent();

    const dismissButton = screen.getByTestId('euiDismissCalloutButton');
    fireEvent.click(dismissButton);

    expect(mockOnDismissPromo).toHaveBeenCalledTimes(1);
  });

  it('calls navigateToApp when CTA button is clicked', () => {
    renderComponent();

    const ctaButton = screen.getByTestId('eisUpdateCalloutCtaBtn');
    fireEvent.click(ctaButton);

    expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
  });

  it('does not render when promo is not visible', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: false,
      onDismissPromo: mockOnDismissPromo,
    });

    renderComponent();

    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('does not render when deployment is not self-managed', () => {
    renderComponent({ isSelfManaged: false });

    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });
});
