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
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ViewMode, PublishesViewMode, PublishesDataViews } from '@kbn/presentation-publishing';
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

    it('highlights matching text (case-insensitive) when titleHighlight matches title', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" titleHighlight="cpu" />
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark?.textContent?.toLowerCase()).toBe('cpu');
    });

    it('highlights all occurrences when titleHighlight appears multiple times', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="Memory Usage" titleHighlight="m" />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBeGreaterThan(0);
      // EuiHighlight with highlightAll should highlight all occurrences
      marks.forEach((mark) => {
        expect(mark.textContent?.toLowerCase()).toBe('m');
      });
    });

    it('does not highlight when titleHighlight does not match title', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" titleHighlight="xyz" />
      );
      const mark = container.querySelector('mark');
      expect(mark).not.toBeInTheDocument();
      expect(screen.getByTestId('embeddablePanelTitle')).toHaveTextContent('CPU Usage');
    });

    it('handles empty titleHighlight string (should not highlight)', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" titleHighlight="" />
      );
      const mark = container.querySelector('mark');
      expect(mark).not.toBeInTheDocument();
      expect(screen.getByTestId('embeddablePanelTitle')).toHaveTextContent('CPU Usage');
    });

    it('handles titleHighlight when panelTitle is undefined (should not render highlight)', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} titleHighlight="cpu" />
      );
      const mark = container.querySelector('mark');
      expect(mark).not.toBeInTheDocument();
    });

    it('handles titleHighlight when panelTitle is empty string (should not render highlight)', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="" titleHighlight="cpu" />
      );
      const mark = container.querySelector('mark');
      expect(mark).not.toBeInTheDocument();
    });

    it('works correctly in view mode (renders as <span>)', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          panelTitle="CPU Usage"
          titleHighlight="cpu"
          viewMode="view"
        />
      );
      const titleElement = screen.getByTestId('embeddablePanelTitle');
      expect(titleElement.nodeName).toBe('SPAN');
      expect(container.querySelector('mark')).toBeInTheDocument();
    });

    it('works correctly in edit mode (renders as <EuiLink>)', () => {
      const apiWithCustomize: DefaultPresentationPanelApi & PublishesViewMode & PublishesDataViews =
        {
          uuid: 'test',
          title$: new BehaviorSubject<string | undefined>('CPU Usage'),
          viewMode$: new BehaviorSubject<ViewMode>('edit'),
          dataViews$: new BehaviorSubject<DataView[] | undefined>([]),
          isCustomizable: true,
        };
      const { container } = renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          api={apiWithCustomize}
          panelTitle="CPU Usage"
          titleHighlight="cpu"
          viewMode="edit"
        />
      );
      const titleElement = screen.getByTestId('embeddablePanelTitle');
      expect(titleElement.nodeName).toBe('BUTTON'); // EuiLink renders as button
      expect(container.querySelector('mark')).toBeInTheDocument();
    });

    it('maintains user-select: text CSS property for text selection', () => {
      renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" titleHighlight="cpu" />
      );
      const titleElement = screen.getByTestId('embeddablePanelTitle');
      const computedStyle = window.getComputedStyle(titleElement);
      expect(computedStyle.userSelect).toBe('text');
    });

    it('highlighting works when title is wrapped in tooltip (with description)', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          panelTitle="CPU Usage"
          panelDescription="This is a description"
          titleHighlight="cpu"
        />
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark?.textContent?.toLowerCase()).toBe('cpu');
      expect(screen.getByTestId('embeddablePanelTitleDescriptionIcon')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles partial matches correctly', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          panelTitle="system.cpu.load_average.15m"
          titleHighlight="cpu.load"
        />
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark?.textContent?.toLowerCase()).toContain('cpu.load');
    });

    it('handles special characters in titleHighlight', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          panelTitle="Test (CPU) Usage"
          titleHighlight="(CPU)"
        />
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeInTheDocument();
      expect(mark?.textContent).toBe('(CPU)');
    });
  });
});
