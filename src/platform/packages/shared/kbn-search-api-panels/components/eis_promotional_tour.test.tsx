/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent, screen } from '@testing-library/react';
import { EisPromotionalTour } from './eis_promotional_tour';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import { EIS_PROMO_TOUR_TITLE, TOUR_CTA } from '../translations';

jest.mock('../hooks/use_show_eis_promotional_content');

const mockToursIsEnabled = jest.fn(() => true);
jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        tours: {
          isEnabled: mockToursIsEnabled,
        },
      },
    },
  }),
}));

describe('EisPromotionalTour', () => {
  const promoId = 'testPromo';
  const dataId = `${promoId}-eis-promo-tour`;
  const childTestId = 'tourChild';

  const renderEisPromotionalTour = (
    props?: Partial<React.ComponentProps<typeof EisPromotionalTour>>
  ) =>
    renderWithI18n(
      <EisPromotionalTour promoId={promoId} isCloudEnabled={true} {...props}>
        <span data-test-subj={childTestId} />
      </EisPromotionalTour>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockToursIsEnabled.mockReturnValue(true);
  });

  it('renders children only when promo is not visible', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: false,
      onDismissPromo: jest.fn(),
    });

    renderEisPromotionalTour();

    // Child should render
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Tour should not render
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders children and does not render the tour when tours is disabled', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });
    mockToursIsEnabled.mockReturnValue(false);

    renderEisPromotionalTour();

    // Child should render
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Tour should not render
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders the tour when promo is visible', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });

    renderEisPromotionalTour();

    const tour = screen.getByTestId(dataId);
    expect(tour).toBeInTheDocument();

    // Child should still render
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Title text should render
    expect(screen.getByText(EIS_PROMO_TOUR_TITLE)).toBeInTheDocument();
  });

  it('calls onDismissPromo when clicking the close button', () => {
    const mockOnDismissPromo = jest.fn();
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: mockOnDismissPromo,
    });

    renderEisPromotionalTour();

    const closeBtn = screen.getByTestId('eisPromoTourCloseBtn');
    fireEvent.click(closeBtn);

    expect(mockOnDismissPromo).toHaveBeenCalledTimes(1);
  });

  it('renders CTA button only when ctaLink is provided', () => {
    const ctaLink = 'https://example.com';
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });

    renderEisPromotionalTour({ ctaLink });

    const ctaBtn = screen.getByTestId('eisPromoTourCtaBtn');
    expect(ctaBtn).toBeInTheDocument();
    expect(ctaBtn).toHaveAttribute('href', ctaLink);
    expect(ctaBtn).toHaveTextContent(TOUR_CTA);
  });

  it('does not render CTA button when ctaLink is undefined', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });

    renderEisPromotionalTour({ ctaLink: undefined });

    expect(screen.queryByTestId('eisPromoTourCtaBtn')).not.toBeInTheDocument();

    // Close button should still exist
    expect(screen.getByTestId('eisPromoTourCloseBtn')).toBeInTheDocument();
  });

  it('removes the tour from the DOM when close button is clicked, child remains', () => {
    // Use a variable to simulate state
    let isVisible = true;
    const mockOnDismissPromo = jest.fn(() => {
      isVisible = false;
    });

    (useShowEisPromotionalContent as jest.Mock).mockImplementation(() => ({
      get isPromoVisible() {
        return isVisible;
      },
      onDismissPromo: mockOnDismissPromo,
    }));

    const { rerender } = renderEisPromotionalTour();

    // Tour exists initially
    expect(screen.getByTestId(dataId)).toBeInTheDocument();
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Click the close button
    fireEvent.click(screen.getByTestId('eisPromoTourCloseBtn'));
    expect(mockOnDismissPromo).toHaveBeenCalledTimes(1);

    // Re-render component to simulate state update
    rerender(
      <EisPromotionalTour promoId={promoId} isCloudEnabled={true}>
        <span data-test-subj={childTestId} />
      </EisPromotionalTour>
    );

    // Tour should be gone, child remains
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
  });
});
