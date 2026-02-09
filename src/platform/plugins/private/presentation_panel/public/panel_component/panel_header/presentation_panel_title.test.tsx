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
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import { PresentationPanelTitle } from './presentation_panel_title';
import type { DefaultPresentationPanelApi } from '../types';

describe('PresentationPanelTitle', () => {
  const mockApi: DefaultPresentationPanelApi = {
    uuid: 'test',
    title$: new BehaviorSubject<string | undefined>('CPU Usage'),
  };

  const defaultProps = {
    api: mockApi,
    headerId: 'test-header-id',
  };

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<EuiThemeProvider>{component}</EuiThemeProvider>);
  };

  describe('titleHighlight functionality', () => {
    it('renders plain text when titleHighlight is not provided', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" />
      );
      const titleElement = screen.getByTestId('embeddablePanelTitle');
      expect(titleElement).toHaveTextContent('CPU Usage');
      expect(container.querySelector('mark')).not.toBeInTheDocument();
    });

    it('renders EuiHighlight component when titleHighlight is provided', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" titleHighlight="cpu" />
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark?.textContent?.toLowerCase()).toBe('cpu');
    });
  });

  describe('accessibility and heading semantics', () => {
    it('renders a heading with header id when panel description is not provided', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" />
      );

      const heading = container.querySelector('h2');
      expect(heading).toBeInTheDocument();

      const labelledElement = container.querySelector(`#${defaultProps.headerId}`);
      expect(labelledElement).toBeInTheDocument();
      expect(labelledElement).toHaveTextContent('Panel: CPU Usage');
    });

    it('renders a heading with header id when panel description is provided', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          panelTitle="CPU Usage"
          panelDescription="Panel description"
        />
      );

      const heading = container.querySelector('h2');
      expect(heading).toBeInTheDocument();

      const labelledElement = container.querySelector(`#${defaultProps.headerId}`);
      expect(labelledElement).toBeInTheDocument();
      expect(labelledElement).toHaveTextContent('Panel: CPU Usage');
    });
  });
});
