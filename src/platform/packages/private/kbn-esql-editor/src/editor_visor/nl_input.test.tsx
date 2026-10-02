/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { act, screen } from '@testing-library/react';
import { css } from '@emotion/react';
import React from 'react';
import { NLInput } from './nl_input';

const inputStyles = css``;

describe('NLInput placeholder typing', () => {
  const props = {
    value: '',
    placeholder: 'Hi',
    disabled: false,
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    inputStyles,
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('types the placeholder once when animation is requested', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    jest.useFakeTimers();
    renderWithI18n(<NLInput {...props} animatePlaceholder />);

    expect(screen.getByTestId('esqlVisorNLPlaceholder')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(32);
    });
    expect(screen.getByTestId('esqlVisorNLPlaceholder').textContent?.startsWith('H')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(32);
    });
    expect(screen.queryByTestId('esqlVisorNLPlaceholder')).not.toBeInTheDocument();
    expect(screen.getByTestId('esqlVisorNLQueryInput')).toHaveAttribute('placeholder', 'Hi');
  });

  it('leaves the placeholder in place when animation is not requested', () => {
    renderWithI18n(<NLInput {...props} />);
    expect(screen.queryByTestId('esqlVisorNLPlaceholder')).not.toBeInTheDocument();
    expect(screen.getByTestId('esqlVisorNLQueryInput')).toHaveAttribute('placeholder', 'Hi');
  });
});
