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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import { PresentationPanelTitle } from './presentation_panel_title';
import type { DefaultPresentationPanelApi } from '../types';
import { isApiCompatibleWithCustomizePanelAction } from '../../../ui_actions/customize_panel_action';
import { openCustomizePanelFlyout } from '../../../ui_actions/customize_panel_action/open_customize_panel';

jest.mock('../../../ui_actions/customize_panel_action', () => ({
  isApiCompatibleWithCustomizePanelAction: jest.fn(() => false),
}));

jest.mock('../../../ui_actions/customize_panel_action/open_customize_panel', () => ({
  openCustomizePanelFlyout: jest.fn(),
}));

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

    it('highlights multiple separate title matches', () => {
      const { container } = renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          panelTitle="System CPU Usage"
          titleHighlight={['system', 'usage']}
        />
      );

      expect(
        Array.from(container.querySelectorAll('mark')).map(({ textContent }) => textContent)
      ).toEqual(['System', 'Usage']);
    });
  });

  describe('title tooltip (no description)', () => {
    it('wraps the title in a tooltip anchor when no panel description is provided', () => {
      renderWithTheme(<PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" />);

      expect(screen.getByTestId('embeddablePanelTitleTooltipAnchor')).toBeInTheDocument();
      expect(screen.queryByTestId('embeddablePanelTitleDescriptionIcon')).not.toBeInTheDocument();
    });

    it('does not render a tooltip when panelTitle is empty', () => {
      renderWithTheme(<PresentationPanelTitle {...defaultProps} panelTitle="" />);

      expect(screen.queryByTestId('embeddablePanelTitleTooltipAnchor')).not.toBeInTheDocument();
    });
  });

  describe('keyboard accessibility in edit mode', () => {
    beforeEach(() => {
      jest.mocked(isApiCompatibleWithCustomizePanelAction).mockReturnValue(true);
      jest.mocked(openCustomizePanelFlyout).mockClear();
    });

    afterEach(() => {
      jest.mocked(isApiCompatibleWithCustomizePanelAction).mockReturnValue(false);
    });

    it('opens the customize panel flyout when Enter is pressed on the editable title', () => {
      renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" viewMode="edit" />
      );

      const titleLink = screen.getByTestId('embeddablePanelTitle');
      fireEvent.keyDown(titleLink, { key: 'Enter', code: 'Enter' });

      expect(openCustomizePanelFlyout).toHaveBeenCalledWith({
        api: mockApi,
        focusOnTitle: true,
      });
    });

    it('does not open the flyout for non-Enter key presses on the editable title', () => {
      renderWithTheme(
        <PresentationPanelTitle {...defaultProps} panelTitle="CPU Usage" viewMode="edit" />
      );

      const titleLink = screen.getByTestId('embeddablePanelTitle');
      fireEvent.keyDown(titleLink, { key: 'Space', code: 'Space' });
      fireEvent.keyDown(titleLink, { key: 'Tab', code: 'Tab' });

      expect(openCustomizePanelFlyout).not.toHaveBeenCalled();
    });
  });

  describe('inline title editing', () => {
    const createWritableApi = (title?: string) => ({
      uuid: 'test',
      title$: new BehaviorSubject<string | undefined>(title),
      hideTitle$: new BehaviorSubject<boolean | undefined>(undefined),
      defaultTitle$: new BehaviorSubject<string | undefined>('Default title'),
      setTitle: jest.fn(),
      setHideTitle: jest.fn(),
    });

    beforeEach(() => {
      jest.mocked(isApiCompatibleWithCustomizePanelAction).mockReturnValue(true);
      jest.mocked(openCustomizePanelFlyout).mockClear();
    });

    afterEach(() => {
      jest.mocked(isApiCompatibleWithCustomizePanelAction).mockReturnValue(false);
    });

    const editTitle = async (value: string) => {
      fireEvent.click(screen.getByTestId('embeddablePanelTitle'));
      const input = await screen.findByTestId('embeddablePanelTitleInput');
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };

    it('saves a new title inline instead of opening the flyout', async () => {
      const api = createWritableApi('CPU Usage');
      renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          api={api}
          panelTitle="CPU Usage"
          viewMode="edit"
        />
      );
      await editTitle('Memory usage');
      await waitFor(() => expect(api.setTitle).toHaveBeenCalledWith('Memory usage'));
      expect(openCustomizePanelFlyout).not.toHaveBeenCalled();
    });

    it('resets to the default title when saving an empty or default value', async () => {
      const api = createWritableApi('CPU Usage');
      renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          api={api}
          panelTitle="CPU Usage"
          viewMode="edit"
        />
      );
      await editTitle('  ');
      await waitFor(() => expect(api.setTitle).toHaveBeenCalledWith(undefined));
    });

    it('is not editable in view mode', () => {
      const api = createWritableApi('CPU Usage');
      renderWithTheme(
        <PresentationPanelTitle
          {...defaultProps}
          api={api}
          panelTitle="CPU Usage"
          viewMode="view"
        />
      );
      expect(screen.queryByTestId('euiInlineReadModeButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('embeddablePanelTitle')).toHaveTextContent('CPU Usage');
    });
  });
});
