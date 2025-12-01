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
import { EisPromotionalCallout, type EisPromotionalCalloutProps } from './eis_promotional_callout';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import {
  EIS_PROMO_CALLOUT_DESCRIPTION,
  EIS_PROMO_CALLOUT_ICON_ALT,
  EIS_PROMO_CALLOUT_TITLE,
} from '../translations';

jest.mock('../hooks/use_show_eis_promotional_content');

describe('EisPromotionalCallout', () => {
  const promoId = 'testPromo';
  const dataId = `${promoId}-eis-promo-callout`;
  const ctaLink = 'https://example.com';
  const direction: EisPromotionalCalloutProps['direction'] = 'row';
  const mockOnSkipTour = jest.fn();

  const renderEisPromotionalCallout = (props?: Partial<EisPromotionalCalloutProps>) => {
    return render(
      <EuiThemeProvider>
        <EisPromotionalCallout
          promoId={promoId}
          ctaLink={ctaLink}
          isCloudEnabled={true}
          direction={direction}
          {...props}
        />
      </EuiThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onSkipTour: mockOnSkipTour,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders callout when promo is visible', () => {
    renderEisPromotionalCallout();

    // Panel exists
    const panel = screen.getByTestId(dataId);
    expect(panel).toBeInTheDocument();

    // Title, description, CTA, and image
    expect(screen.getByText(EIS_PROMO_CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(EIS_PROMO_CALLOUT_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByTestId('eisPromoCalloutCtaBtn')).toBeInTheDocument();
    expect(screen.getByAltText(EIS_PROMO_CALLOUT_ICON_ALT)).toBeInTheDocument();
  });

  it('calls onSkipTour when dismiss button is clicked', () => {
    renderEisPromotionalCallout();

    const dismissButton = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissButton);

    expect(mockOnSkipTour).toHaveBeenCalledTimes(1);
  });

  it('does not render callout when promo is not visible', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: false,
      onSkipTour: mockOnSkipTour,
    });

    renderEisPromotionalCallout();
    const panel = screen.queryByTestId(dataId);
    expect(panel).not.toBeInTheDocument();
  });
});
