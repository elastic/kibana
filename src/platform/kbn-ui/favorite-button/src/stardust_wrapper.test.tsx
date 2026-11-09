/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { STARDUST_ANIMATION_MS, StardustWrapper } from './stardust_wrapper';

describe('StardustWrapper', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies stardust-active while active is true', () => {
    const { container } = render(
      <StardustWrapper active>
        <span>child</span>
      </StardustWrapper>
    );

    expect(container.firstChild).toHaveClass('stardust-active');
  });

  it('keeps stardust-active after active becomes false until the animation window ends', () => {
    const { container, rerender } = render(
      <StardustWrapper active>
        <span>child</span>
      </StardustWrapper>
    );

    expect(container.firstChild).toHaveClass('stardust-active');

    rerender(
      <StardustWrapper active={false}>
        <span>child</span>
      </StardustWrapper>
    );

    expect(container.firstChild).toHaveClass('stardust-active');

    act(() => {
      jest.advanceTimersByTime(STARDUST_ANIMATION_MS - 1);
    });
    expect(container.firstChild).toHaveClass('stardust-active');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(container.firstChild).not.toHaveClass('stardust-active');
  });
});
