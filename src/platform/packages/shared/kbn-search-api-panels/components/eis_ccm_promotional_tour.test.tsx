/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import '@testing-library/jest-dom';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent, screen } from '@testing-library/react';
import { EisCloudConnectPromoTour } from './eis_ccm_promotional_tour';
import { useKibana } from '../hooks/use_kibana';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import * as i18n from '../translations';
import { notificationServiceMock } from '@kbn/core/public/mocks';

vi.mock('../hooks/use_show_eis_promotional_content');
vi.mock('../hooks/use_kibana');

const mockUiSettingsGet = vi.fn();
const mockNavigateToApp = vi.fn();

const mockUseKibana = (overrides?: Partial<any>) => {
  (useKibana as Mock).mockReturnValue({
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
      notifications: notificationServiceMock.createStartContract(),
      ...overrides,
    },
  });
};

describe('EisCloudConnectPromoTour', () => {
  const promoId = 'cloudConnectPromo';
  const dataId = `${promoId}-cloud-connect-tour`;
  const childTestId = 'tourChild';

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof EisCloudConnectPromoTour>> = {}
  ) =>
    renderWithI18n(
      <EisCloudConnectPromoTour
        promoId={promoId}
        isSelfManaged={true}
        navigateToApp={mockNavigateToApp}
        {...props}
      >
        <span data-test-subj={childTestId} />
      </EisCloudConnectPromoTour>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockUiSettingsGet.mockReturnValue(true);
    mockUseKibana();
  });

  it('renders children only when promo is not visible', () => {
    (useShowEisPromotionalContent as Mock).mockReturnValue({
      isPromoVisible: false,
      onDismissPromo: vi.fn(),
    });

    renderComponent();

    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders children and does not render the tour when isReady is false', () => {
    (useShowEisPromotionalContent as Mock).mockReturnValue({
      isPromoVisible: true, // would normally show the tour
      onDismissPromo: vi.fn(),
    });

    renderComponent({ isReady: false });

    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders children and does not render the tour when isSelfManaged is false', () => {
    (useShowEisPromotionalContent as Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: vi.fn(),
    });

    renderComponent({ isSelfManaged: false });

    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders children and does not render the tour when tours is disabled', () => {
    (useShowEisPromotionalContent as Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: vi.fn(),
    });
    mockUseKibana({
      notifications: {
        tours: {
          isEnabled: vi.fn().mockReturnValue(false),
        },
      },
    });

    renderComponent();

    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders the tour when promo is visible', () => {
    (useShowEisPromotionalContent as Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: vi.fn(),
    });

    renderComponent();

    expect(screen.getByTestId(dataId)).toBeInTheDocument();
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
    expect(screen.getByText(i18n.EIS_CLOUD_CONNECT_PROMO_TOUR_TITLE)).toBeInTheDocument();
  });

  it('renders CTA button and calls navigateToApp when clicked', () => {
    (useShowEisPromotionalContent as Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: vi.fn(),
    });

    renderComponent();

    const ctaBtn = screen.getByTestId('eisCloudConnectPromoTourCtaBtn');

    expect(ctaBtn).toBeInTheDocument();
    expect(ctaBtn).toHaveTextContent(i18n.EIS_CLOUD_CONNECT_PROMO_TOUR_CTA);

    fireEvent.click(ctaBtn);
    expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
  });

  it('removes the tour from DOM after clicking Dismiss, children remain', () => {
    let visible = true;
    const mockOnDismissPromo = vi.fn(() => {
      visible = false;
    });

    (useShowEisPromotionalContent as Mock).mockImplementation(() => ({
      get isPromoVisible() {
        return visible;
      },
      onDismissPromo: mockOnDismissPromo,
    }));

    const { rerender } = renderComponent();

    expect(screen.getByTestId(dataId)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('eisCloudConnectPromoTourCloseBtn'));
    expect(mockOnDismissPromo).toHaveBeenCalledTimes(1);

    rerender(
      <EisCloudConnectPromoTour
        promoId={promoId}
        isSelfManaged={true}
        navigateToApp={mockNavigateToApp}
      >
        <span data-test-subj={childTestId} />
      </EisCloudConnectPromoTour>
    );

    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
  });
});
