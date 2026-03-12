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
import { InferenceCostsTransparencyTour } from './inference_costs_transparency_tour';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import * as i18n from '../translations';

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

describe('InferenceCostsTransparencyTour', () => {
  const promoId = 'tokenPromo';
  const dataId = `${promoId}-inference-costs-tour`;
  const childTestId = 'tourChild';

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof InferenceCostsTransparencyTour>> = {}
  ) =>
    renderWithI18n(
      <InferenceCostsTransparencyTour promoId={promoId} isCloudEnabled={true} {...props}>
        <span data-test-subj={childTestId} />
      </InferenceCostsTransparencyTour>
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

    renderComponent();

    // Child should render
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Tour should not render
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders children and does not render the tour when isReady is false', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true, // would normally show the tour
      onDismissPromo: jest.fn(),
    });

    renderComponent({ isReady: false });

    // Child should be rendered
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Tour should NOT be rendered even though promo is visible
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders children and does not render the tour when tours is disabled', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });
    mockToursIsEnabled.mockReturnValue(false);

    renderComponent();

    // Child should be rendered
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Tour should NOT be rendered
    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
  });

  it('renders the tour when promo is visible', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });

    renderComponent();

    expect(screen.getByTestId(dataId)).toBeInTheDocument();
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();

    // Title should render
    expect(screen.getByText(i18n.COSTS_TOUR_TITLE)).toBeInTheDocument();
  });

  it('renders CTA button and passes href when ctaLink is provided', () => {
    const ctaLink = 'https://elastic.co/example';

    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });

    renderComponent({ ctaLink });

    const ctaBtn = screen.getByTestId('inferenceCostsTourCtaBtn');

    expect(ctaBtn).toBeInTheDocument();
    expect(ctaBtn).toHaveAttribute('href', ctaLink);
    expect(ctaBtn).toHaveTextContent(i18n.TOUR_CTA);
  });

  it('does not render CTA button when ctaLink is undefined', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: jest.fn(),
    });

    renderComponent({ ctaLink: undefined });

    const ctaBtn = screen.queryByTestId('inferenceCostsTourCtaBtn');
    expect(ctaBtn).not.toBeInTheDocument();
  });

  it('removes the tour from DOM after clicking close, children remain', () => {
    let visible = true;
    const mockOnDismissPromo = jest.fn(() => {
      visible = false;
    });

    (useShowEisPromotionalContent as jest.Mock).mockImplementation(() => ({
      get isPromoVisible() {
        return visible;
      },
      onDismissPromo: mockOnDismissPromo,
    }));

    const { rerender } = renderComponent();

    expect(screen.getByTestId(dataId)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('inferenceCostsTourCloseBtn'));
    expect(mockOnDismissPromo).toHaveBeenCalledTimes(1);

    rerender(
      <InferenceCostsTransparencyTour promoId={promoId} isCloudEnabled={true}>
        <span data-test-subj={childTestId} />
      </InferenceCostsTransparencyTour>
    );

    expect(screen.queryByTestId(dataId)).not.toBeInTheDocument();
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
  });
});
