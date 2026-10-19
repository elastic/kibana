/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockPlayButton = jest.fn((props: Record<string, unknown>) => null);

jest.mock('./play_button', () => ({
  PlayButton: (props: Record<string, unknown>) => {
    mockPlayButton(props);
    return null;
  },
}));

import React from 'react';
import { render } from '@testing-library/react';
import { TimeSliderPrepend } from './time_slider_prepend';

describe('TimeSliderPrepend', () => {
  const defaultProps = {
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    viewMode: 'view' as const,
    disablePlayButton: false,
    setIsPopoverOpen: jest.fn(),
  };

  beforeEach(() => {
    mockPlayButton.mockClear();
  });

  describe('previous and next buttons', () => {
    it('should enable previous and next buttons when viewMode is not non-interactive', () => {
      const { getByTestId } = render(<TimeSliderPrepend {...defaultProps} viewMode="view" />);
      expect(getByTestId('timeSlider-previousTimeWindow')).not.toBeDisabled();
      expect(getByTestId('timeSlider-nextTimeWindow')).not.toBeDisabled();
    });

    it('should disable previous and next buttons when viewMode is non-interactive', () => {
      const { getByTestId } = render(
        <TimeSliderPrepend {...defaultProps} viewMode="non-interactive" />
      );
      expect(getByTestId('timeSlider-previousTimeWindow')).toBeDisabled();
      expect(getByTestId('timeSlider-nextTimeWindow')).toBeDisabled();
    });
  });

  describe('play button', () => {
    it('should pass disablePlayButton=true to PlayButton when viewMode is non-interactive', () => {
      render(<TimeSliderPrepend {...defaultProps} viewMode="non-interactive" />);
      expect(mockPlayButton).toHaveBeenCalledWith(
        expect.objectContaining({ disablePlayButton: true })
      );
    });

    it('should pass disablePlayButton=false to PlayButton when viewMode is not non-interactive and disablePlayButton prop is false', () => {
      render(<TimeSliderPrepend {...defaultProps} viewMode="view" disablePlayButton={false} />);
      expect(mockPlayButton).toHaveBeenCalledWith(
        expect.objectContaining({ disablePlayButton: false })
      );
    });
  });
});
