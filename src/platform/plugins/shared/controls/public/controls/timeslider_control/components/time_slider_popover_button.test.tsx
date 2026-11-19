/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimeSliderPopoverButton } from './time_slider_popover_button';

describe('TimeSliderPopoverButton', () => {
  const defaultProps = {
    from: 0,
    to: 1000,
    formatDate: (v: number) => String(v),
    onClick: jest.fn(),
    isInteractive: true,
  };

  it('should enable the popover toggle button when isInteractive is true', () => {
    const { getByTestId } = render(
      <TimeSliderPopoverButton {...defaultProps} isInteractive={true} />
    );
    expect(getByTestId('timeSlider-popoverToggleButton')).not.toBeDisabled();
  });

  it('should disable the popover toggle button when isInteractive is false', () => {
    const { getByTestId } = render(
      <TimeSliderPopoverButton {...defaultProps} isInteractive={false} />
    );
    expect(getByTestId('timeSlider-popoverToggleButton')).toBeDisabled();
  });
});
