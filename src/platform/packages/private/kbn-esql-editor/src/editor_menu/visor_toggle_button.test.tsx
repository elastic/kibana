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
import { fireEvent, render, screen } from '@testing-library/react';
import { VisorToggleButton } from './visor_toggle_button';

const renderButton = (props: Partial<React.ComponentProps<typeof VisorToggleButton>> = {}) => {
  const allProps = {
    isNlToEsqlEnabled: true,
    isVisorOpen: false,
    tooltip: 'Search',
    onToggle: jest.fn(),
    ...props,
  };
  const result = render(<VisorToggleButton {...allProps} />);
  return {
    ...result,
    rerenderWith: (next: Partial<React.ComponentProps<typeof VisorToggleButton>>) =>
      result.rerender(<VisorToggleButton {...allProps} {...next} />),
  };
};

const hasAiGradient = (container: HTMLElement) =>
  container.querySelector('linearGradient') !== null;

describe('VisorToggleButton', () => {
  it('toggles the visor on click', () => {
    const onToggle = jest.fn();
    renderButton({ onToggle });
    fireEvent.click(screen.getByTestId('esql-menu-button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects the visor state with aria-pressed', () => {
    const { rerenderWith } = renderButton();
    expect(screen.getByTestId('esql-menu-button')).toHaveAttribute('aria-pressed', 'false');
    rerenderWith({ isVisorOpen: true });
    expect(screen.getByTestId('esql-menu-button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses the AI look only while the visor is open in natural language mode', () => {
    const { container, rerenderWith } = renderButton();
    expect(hasAiGradient(container)).toBe(false);

    rerenderWith({ isVisorOpen: true });
    expect(hasAiGradient(container)).toBe(true);

    rerenderWith({ isVisorOpen: true, isNlToEsqlEnabled: false });
    expect(hasAiGradient(container)).toBe(false);
  });

  it('keeps the same button, and its focus, when the visor opens and closes', () => {
    const { rerenderWith } = renderButton();
    const button = screen.getByTestId('esql-menu-button');
    button.focus();

    rerenderWith({ isVisorOpen: true });
    expect(screen.getByTestId('esql-menu-button')).toBe(button);
    expect(button).toHaveFocus();

    rerenderWith({ isVisorOpen: false });
    expect(screen.getByTestId('esql-menu-button')).toBe(button);
    expect(button).toHaveFocus();
  });

  it('is disabled when there is no visor to toggle', () => {
    renderButton({ onToggle: undefined });
    expect(screen.getByTestId('esql-menu-button')).toBeDisabled();
  });
});
