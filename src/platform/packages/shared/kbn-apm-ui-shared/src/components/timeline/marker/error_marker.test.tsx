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
import type { ErrorMark } from './error_marker';
import { ErrorMarker } from './error_marker';

function renderWithTheme(component: React.ReactNode) {
  return render(<EuiThemeProvider>{component}</EuiThemeProvider>);
}

function buildMark(overrides: Partial<ErrorMark> = {}): ErrorMark {
  return {
    type: 'errorMark',
    id: 'error-1',
    offset: 1500000,
    verticalLine: false,
    serviceColor: '#ff0000',
    error: {
      service: { name: 'my-service' },
      error: {
        exception: { message: 'Something went wrong' },
        grouping_key: 'abc123',
      },
    } as any,
    ...overrides,
  };
}

describe('ErrorMarker', () => {
  describe('popover trigger', () => {
    it('renders a clickable marker button', () => {
      renderWithTheme(<ErrorMarker mark={buildMark()} />);

      expect(screen.getByTestId('popover')).toBeInTheDocument();
    });

    it('opens the popover when the marker button is clicked', () => {
      renderWithTheme(<ErrorMarker mark={buildMark()} />);

      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByText('my-service')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('can be toggled by clicking the marker button repeatedly', () => {
      renderWithTheme(<ErrorMarker mark={buildMark()} />);

      // Opens on first click — content rendered in popover portal
      fireEvent.click(screen.getByTestId('popover'));
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Button remains clickable after toggle
      fireEvent.click(screen.getByTestId('popover'));
      expect(screen.getByTestId('popover')).toBeInTheDocument();
    });
  });

  describe('popover content', () => {
    it('shows the service name', () => {
      renderWithTheme(<ErrorMarker mark={buildMark()} />);

      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByText('my-service')).toBeInTheDocument();
    });

    it('shows the error message from exception', () => {
      renderWithTheme(<ErrorMarker mark={buildMark()} />);

      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('prefers log message over exception message', () => {
      const mark = buildMark({
        error: {
          service: { name: 'my-service' },
          error: {
            log: { message: 'Log message' },
            exception: { message: 'Exception message' },
            grouping_key: 'abc123',
          },
        } as any,
      });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByText('Log message')).toBeInTheDocument();
      expect(screen.queryByText('Exception message')).not.toBeInTheDocument();
    });
  });

  describe('error message rendering — three-way fallback', () => {
    it('renders an EuiLink when errorMarkerHref is provided', () => {
      const mark = buildMark({ errorMarkerHref: '/app/apm/services/my-service/errors/abc123' });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));

      const link = screen.getByRole('link', { name: 'Something went wrong' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/app/apm/services/my-service/errors/abc123');
    });

    it('the error link href navigates to the error detail page', () => {
      const mark = buildMark({ errorMarkerHref: '/app/apm/services/my-service/errors/abc123' });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByRole('link', { name: 'Something went wrong' })).toHaveAttribute(
        'href',
        '/app/apm/services/my-service/errors/abc123'
      );
    });

    it('renders an EuiButtonEmpty when onClick is provided and errorMarkerHref is not', () => {
      const onClick = jest.fn();
      const mark = buildMark({ onClick });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByTestId('apmTimelineErrorMarkerButton')).toBeInTheDocument();
    });

    it('calls onClick when the error button is clicked', () => {
      const onClick = jest.fn();
      const mark = buildMark({ onClick });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));
      fireEvent.click(screen.getByTestId('apmTimelineErrorMarkerButton'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('errorMarkerHref takes priority over onClick', () => {
      const onClick = jest.fn();
      const mark = buildMark({
        errorMarkerHref: '/app/apm/services/my-service/errors/abc123',
        onClick,
      });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByRole('link', { name: 'Something went wrong' })).toBeInTheDocument();
      expect(screen.queryByTestId('apmTimelineErrorMarkerButton')).not.toBeInTheDocument();
    });

    it('renders plain text when neither errorMarkerHref nor onClick are provided', () => {
      renderWithTheme(<ErrorMarker mark={buildMark()} />);

      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.queryByTestId('apmTimelineErrorMarkerButton')).not.toBeInTheDocument();
    });
  });

  describe('error message truncation', () => {
    it('shows full message when it is 240 characters or fewer', () => {
      const message = 'a'.repeat(240);
      const mark = buildMark({
        error: {
          service: { name: 'svc' },
          error: { exception: { message }, grouping_key: 'k' },
        } as any,
      });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('truncates message with ellipsis when it exceeds 240 characters', () => {
      const message = 'a'.repeat(241);
      const mark = buildMark({
        error: {
          service: { name: 'svc' },
          error: { exception: { message }, grouping_key: 'k' },
        } as any,
      });

      renderWithTheme(<ErrorMarker mark={mark} />);
      fireEvent.click(screen.getByTestId('popover'));

      expect(screen.getByText('a'.repeat(240) + '\u2026')).toBeInTheDocument();
    });
  });
});
