/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { Legend, Shape, Indicator } from './legend';

function renderWithTheme(component: React.ReactNode) {
  return render(<EuiThemeProvider>{component}</EuiThemeProvider>);
}

describe('Legend', () => {
  describe('text', () => {
    it('renders text when provided', () => {
      renderWithTheme(<Legend text="my-service" />);

      expect(screen.getByText('my-service')).toBeInTheDocument();
    });

    it('renders nothing when text is omitted', () => {
      const { container } = renderWithTheme(<Legend />);

      expect(container.textContent).toBe('');
    });
  });

  describe('indicator', () => {
    it('renders the default Indicator when no custom indicator is provided', () => {
      const { container } = renderWithTheme(<Legend color="#ff0000" />);

      // Indicator is a styled span — the only span inside the container
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('renders a custom indicator instead of the default when provided', () => {
      renderWithTheme(<Legend indicator={<div data-test-subj="custom-indicator" />} />);

      expect(screen.getByTestId('custom-indicator')).toBeInTheDocument();
    });

    it('does not render the default Indicator when a custom indicator is provided', () => {
      const { container } = renderWithTheme(
        <Legend indicator={<div data-test-subj="custom-indicator" />} />
      );

      expect(container.querySelector('span')).not.toBeInTheDocument();
    });
  });

  describe('onClick', () => {
    it('calls onClick when clicked', () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(<Legend onClick={onClick} text="clickable" />);

      fireEvent.click(container.firstElementChild!);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not throw when clicked without an onClick handler', () => {
      const { container } = renderWithTheme(<Legend text="no handler" />);

      expect(() => fireEvent.click(container.firstElementChild!)).not.toThrow();
    });
  });

  describe('disabled prop', () => {
    it('applies reduced opacity when disabled is true', () => {
      const { container } = renderWithTheme(<Legend disabled={true} text="disabled" />);

      expect(container.firstElementChild).toHaveStyle({ opacity: '0.4' });
    });

    it('applies full opacity when disabled is false', () => {
      const { container } = renderWithTheme(<Legend disabled={false} text="enabled" />);

      expect(container.firstElementChild).toHaveStyle({ opacity: '1' });
    });

    it('is not disabled by default', () => {
      const { container } = renderWithTheme(<Legend text="default" />);

      expect(container.firstElementChild).toHaveStyle({ opacity: '1' });
    });
  });

  describe('clickable prop', () => {
    it('applies pointer cursor when clickable is true', () => {
      const { container } = renderWithTheme(<Legend clickable={true} />);

      expect(container.firstElementChild).toHaveStyle({ cursor: 'pointer' });
    });

    it('applies pointer cursor when onClick is provided (even without clickable)', () => {
      const { container } = renderWithTheme(<Legend onClick={jest.fn()} />);

      expect(container.firstElementChild).toHaveStyle({ cursor: 'pointer' });
    });

    it('applies initial cursor when neither clickable nor onClick', () => {
      const { container } = renderWithTheme(<Legend />);

      expect(container.firstElementChild).toHaveStyle({ cursor: 'initial' });
    });
  });
});

describe('Shape', () => {
  it('exports circle and square values', () => {
    expect(Shape.circle).toBe('circle');
    expect(Shape.square).toBe('square');
  });
});

describe('Indicator', () => {
  it('applies border-radius 100% for circle shape', () => {
    const { container } = render(
      <EuiThemeProvider>
        <Indicator color="#ff0000" shape={Shape.circle} withMargin={false} />
      </EuiThemeProvider>
    );

    expect(container.firstElementChild).toHaveStyle({ borderRadius: '100%' });
  });

  it('applies border-radius 0 for square shape', () => {
    const { container } = render(
      <EuiThemeProvider>
        <Indicator color="#ff0000" shape={Shape.square} withMargin={false} />
      </EuiThemeProvider>
    );

    expect(container.firstElementChild).toHaveStyle({ borderRadius: '0' });
  });

  it('applies the given background color', () => {
    const { container } = render(
      <EuiThemeProvider>
        <Indicator color="rgb(255, 0, 0)" shape={Shape.circle} withMargin={false} />
      </EuiThemeProvider>
    );

    expect(container.firstElementChild).toHaveStyle({ background: 'rgb(255, 0, 0)' });
  });

  it('applies margin-right when withMargin is true', () => {
    const { container } = render(
      <EuiThemeProvider>
        <Indicator color="#ff0000" shape={Shape.circle} withMargin={true} />
      </EuiThemeProvider>
    );

    expect(container.firstElementChild).toHaveStyle({ marginRight: '5.5px' });
  });

  it('applies no margin-right when withMargin is false', () => {
    const { container } = render(
      <EuiThemeProvider>
        <Indicator color="#ff0000" shape={Shape.circle} withMargin={false} />
      </EuiThemeProvider>
    );

    expect(container.firstElementChild).toHaveStyle({ marginRight: '0' });
  });
});
