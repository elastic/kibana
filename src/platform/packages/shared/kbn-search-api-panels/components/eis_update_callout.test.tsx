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
import { EisUpdateCallout, type EisUpdateCalloutProps } from './eis_update_callout';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';

import {
  EIS_CALLOUT_TITLE,
  EIS_UPDATE_CALLOUT_DESCRIPTION,
  EIS_UPDATE_CALLOUT_CTA,
  EIS_CALLOUT_DOCUMENTATION_BTN,
} from '../translations';

jest.mock('../hooks/use_show_eis_promotional_content');

describe('EisUpdateCallout', () => {
  const promoId = 'testPromo';
  const dataId = `${promoId}-eis-update-callout`;
  const ctaLink = 'https://example.com';
  const direction: EisUpdateCalloutProps['direction'] = 'row';

  const mockOnDismissPromo = jest.fn();
  const mockHandleOnClick = jest.fn();

  const renderEisUpdateCallout = (props?: Partial<EisUpdateCalloutProps>) => {
    return render(
      <EuiThemeProvider>
        <EisUpdateCallout
          promoId={promoId}
          ctaLink={ctaLink}
          shouldShowEisUpdateCallout={true}
          direction={direction}
          hasUpdatePrivileges={true}
          handleOnClick={mockHandleOnClick}
          {...props}
        />
      </EuiThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: true,
      onDismissPromo: mockOnDismissPromo,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders callout when promo is visible', () => {
    renderEisUpdateCallout();

    const panel = screen.getByTestId(dataId);
    expect(panel).toBeInTheDocument();

    expect(screen.getByText(EIS_CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(EIS_UPDATE_CALLOUT_DESCRIPTION)).toBeInTheDocument();

    expect(screen.getByText(EIS_UPDATE_CALLOUT_CTA)).toBeInTheDocument();
    expect(screen.getByText(EIS_CALLOUT_DOCUMENTATION_BTN)).toBeInTheDocument();
  });

  it('calls onDismissPromo when dismiss button is clicked', () => {
    renderEisUpdateCallout();

    const dismissButton = screen.getByTestId('euiDismissCalloutButton');
    fireEvent.click(dismissButton);

    expect(mockOnDismissPromo).toHaveBeenCalledTimes(1);
  });

  it('calls handleOnClick when CTA button is clicked', () => {
    renderEisUpdateCallout();

    const ctaButton = screen.getByTestId('eisUpdateCalloutCtaBtn');
    fireEvent.click(ctaButton);

    expect(mockHandleOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not render callout when promo is not visible', () => {
    (useShowEisPromotionalContent as jest.Mock).mockReturnValue({
      isPromoVisible: false,
      onDismissPromo: mockOnDismissPromo,
    });

    renderEisUpdateCallout();

    const panel = screen.queryByTestId(dataId);
    expect(panel).not.toBeInTheDocument();
  });

  it('does not render callout when user does not have the necessary environment/licensing', () => {
    renderEisUpdateCallout({ shouldShowEisUpdateCallout: false });

    const panel = screen.queryByTestId(dataId);
    expect(panel).not.toBeInTheDocument();
  });

  it('does not render callout when user does not have update privileges', () => {
    renderEisUpdateCallout({ hasUpdatePrivileges: false });

    const panel = screen.queryByTestId(dataId);
    expect(panel).not.toBeInTheDocument();
  });

  it('renders documentation link with correct href', () => {
    renderEisUpdateCallout();

    const docLink = screen.getByText(EIS_CALLOUT_DOCUMENTATION_BTN);
    expect(docLink).toHaveAttribute('href', ctaLink);
  });
});
