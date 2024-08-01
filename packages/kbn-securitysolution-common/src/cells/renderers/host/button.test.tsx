/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { HostDetailsButton } from './button';
import { render, screen } from '@testing-library/react';

const onClickMock = jest.fn();
const TestComponent = () => {
  return <HostDetailsButton onClick={onClickMock}>Test</HostDetailsButton>;
};

describe('Host Button', () => {
  it('should render as button with link formatting', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('host-details-button')).toBeVisible();
    expect(screen.getByTestId('host-details-button')).toHaveAttribute('type', 'button');
    expect(screen.getByTestId('host-details-button')).toHaveClass('euiLink');
  });

  it('should perform onClick Correctly', () => {
    render(<TestComponent />);
    screen.getByTestId('host-details-button').click();
    expect(onClickMock).toHaveBeenCalled();
  });
});
