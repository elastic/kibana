/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DataView } from '@kbn/data-views-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';
import { PublishesDataViews, ViewMode } from '@kbn/presentation-publishing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import * as openCustomizePanel from '../../panel_actions/customize_panel_action/open_customize_panel';
import { DefaultPresentationPanelApi } from '../types';
import { PresentationPanelHeader } from './presentation_panel_header';

const DEFAULT_PANEL_TITLE = 'Panel title';

describe('presentation panel header', () => {
  let api: DefaultPresentationPanelApi & PublishesDataViews;
  let setViewMode: (viewMode: ViewMode) => void;
  let setTitle: (title: string | undefined) => void;
  let setDescription: (description: string | undefined) => void;

  beforeEach(() => {
    const titleSubject = new BehaviorSubject<string | undefined>(DEFAULT_PANEL_TITLE);
    setTitle = jest.fn().mockImplementation((title) => titleSubject.next(title));
    const descriptionSubject = new BehaviorSubject<string | undefined>(undefined);
    setDescription = jest
      .fn()
      .mockImplementation((description) => descriptionSubject.next(description));
    const viewMode = new BehaviorSubject<ViewMode>('edit');
    setViewMode = jest.fn().mockImplementation((nextViewMode) => viewMode.next(nextViewMode));

    api = {
      viewMode,
      panelTitle: titleSubject,
      panelDescription: descriptionSubject,
      dataViews: new BehaviorSubject<DataView[] | undefined>([]),
    };
  });

  const renderPanelHeader = () => {
    return render(
      <I18nProvider>
        <PresentationPanelHeader api={api} headerId={'header'} />
      </I18nProvider>
    );
  };

  describe('view mode', () => {
    beforeEach(() => {
      setViewMode('view');
    });

    it('renders title from API', async () => {
      renderPanelHeader();
      const titleComponent = await screen.findByTestId('dashboardPanelTitle');
      expect(titleComponent).toHaveTextContent(DEFAULT_PANEL_TITLE);
    });

    it('renders tooltip + icon API provides description', async () => {
      setDescription('a description!');
      renderPanelHeader();

      expect(await screen.findByTestId('embeddablePanelTooltipAnchor')).toBeInTheDocument();
      expect(await screen.findByTestId('embeddablePanelTitleDescriptionIcon')).toBeInTheDocument();
    });

    it('hides blank titles', async () => {
      setTitle('');
      renderPanelHeader();

      const header = await screen.findByTestId('embeddablePanelHeading');
      const titleComponent = screen.queryByTestId('dashboardPanelTitle');
      expect(header).not.toContainElement(titleComponent);
    });

    it('respects the hide panel title setting from the API', async () => {
      api.hidePanelTitle = new BehaviorSubject<boolean | undefined>(true);
      renderPanelHeader();

      const header = await screen.findByTestId('embeddablePanelHeading');
      const titleComponent = screen.queryByTestId('dashboardPanelTitle');
      expect(header).not.toContainElement(titleComponent);
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      setViewMode('view');
    });

    it('renders title from API', async () => {
      renderPanelHeader();
      const titleComponent = await screen.findByTestId('dashboardPanelTitle');
      expect(titleComponent).toHaveTextContent(DEFAULT_PANEL_TITLE);
    });

    it('renders [No title] when the API provides a blank title', async () => {
      setTitle('');
      renderPanelHeader();
      const titleComponent = await screen.findByTestId('embeddablePanelTitleInner');
      expect(titleComponent).toHaveTextContent('[No Title]');
    });

    it('renders **only** the context menu button when title is hidden', async () => {
      api.hidePanelTitle = new BehaviorSubject<boolean | undefined>(true);
      renderPanelHeader();
      const titleComponent = await screen.findByTestId('embeddablePanelHeading-');
      const innerTitleComponent = await screen.findByTestId('embeddablePanelTitleInner');
      expect(innerTitleComponent).toBeEmptyDOMElement();
      const menuComponent = await screen.findByTestId('embeddablePanelToggleMenuIcon');
      expect(titleComponent).toContainElement(menuComponent);
    });

    it('opens the customize panel flyout when the title is clicked', async () => {
      renderPanelHeader();
      const titleComponent = await screen.findByTestId('embeddablePanelTitleLink');

      const spy = jest.spyOn(openCustomizePanel, 'openCustomizePanelFlyout');
      userEvent.click(titleComponent);
      expect(spy).toHaveBeenCalled();
    });
  });
});
