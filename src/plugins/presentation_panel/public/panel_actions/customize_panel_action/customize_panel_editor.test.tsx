/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { I18nProvider } from '@kbn/i18n-react';
import { ViewMode } from '@kbn/presentation-publishing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { CustomizePanelActionApi } from './customize_panel_action';
import { CustomizePanelEditor } from './customize_panel_editor';

describe('customize panel editor', () => {
  let api: CustomizePanelActionApi;
  let setTitle: (title: string | undefined) => void;
  let setViewMode: (viewMode: ViewMode) => void;
  let setDescription: (description: string | undefined) => void;

  beforeEach(() => {
    const titleSubject = new BehaviorSubject<string | undefined>(undefined);
    setTitle = jest.fn().mockImplementation((title) => titleSubject.next(title));
    const descriptionSubject = new BehaviorSubject<string | undefined>(undefined);
    setDescription = jest
      .fn()
      .mockImplementation((description) => descriptionSubject.next(description));
    const viewMode = new BehaviorSubject<ViewMode>('edit');
    setViewMode = jest.fn().mockImplementation((nextViewMode) => viewMode.next(nextViewMode));

    api = {
      viewMode,
      dataViews: new BehaviorSubject<DataView[] | undefined>([]),
      panelTitle: titleSubject,
      setPanelTitle: setTitle,
      panelDescription: descriptionSubject,
      setPanelDescription: setDescription,
    };
  });

  const renderPanelEditor = (props?: { focusOnTitle: boolean }) => {
    return render(
      <I18nProvider>
        <CustomizePanelEditor api={api} onClose={jest.fn()} focusOnTitle={props?.focusOnTitle} />
      </I18nProvider>
    );
  };

  describe('panel title and description', () => {
    test('does not render if in view mode', async () => {
      setViewMode('view');
      renderPanelEditor();

      const customizePanelForm = await screen.findByTestId('customizePanelForm');
      const titleDescriptionComponent = screen.queryByTestId('customEmbeddableTitleComponent');
      expect(customizePanelForm).not.toContainElement(titleDescriptionComponent);
    });

    it('Initializes panel title with default title from API', () => {
      api.defaultPanelTitle = new BehaviorSubject<string | undefined>('Default title');
      renderPanelEditor();
      expect(screen.getByTestId('customEmbeddablePanelTitleInput')).toHaveValue('Default title');
    });

    it('Initializes panel title with title from API', () => {
      setTitle('Very cool custom title');
      renderPanelEditor();
      expect(screen.getByTestId('customEmbeddablePanelTitleInput')).toHaveValue(
        'Very cool custom title'
      );
    });

    it('Sets panel title on apply', () => {
      renderPanelEditor();
      userEvent.type(screen.getByTestId('customEmbeddablePanelTitleInput'), 'New title');
      userEvent.click(screen.getByTestId('saveCustomizePanelButton'));
      expect(setTitle).toBeCalledWith('New title');
    });

    it('Resets panel title to default when reset button is pressed', () => {
      api.defaultPanelTitle = new BehaviorSubject<string | undefined>('Default title');
      renderPanelEditor();
      userEvent.type(screen.getByTestId('customEmbeddablePanelTitleInput'), 'New title');
      userEvent.click(screen.getByTestId('resetCustomEmbeddablePanelTitleButton'));
      expect(screen.getByTestId('customEmbeddablePanelTitleInput')).toHaveValue('Default title');
    });

    it('Reset panel title to undefined on apply', () => {
      setTitle('very cool title');
      renderPanelEditor();
      userEvent.click(screen.getByTestId('resetCustomEmbeddablePanelTitleButton'));
      userEvent.click(screen.getByTestId('saveCustomizePanelButton'));
      expect(setTitle).toBeCalledWith(undefined);
    });

    test('title input receives focus when `focusOnTitle` is `true`', async () => {
      renderPanelEditor({ focusOnTitle: true });

      const customTitleComponent = await screen.findByTestId('customEmbeddablePanelTitleInput');
      expect(customTitleComponent).toHaveFocus();
    });

    test('title input does not receive focus when `focusOnTitle` is `false`', async () => {
      renderPanelEditor({ focusOnTitle: false });

      const customTitleComponent = await screen.findByTestId('customEmbeddablePanelTitleInput');
      expect(customTitleComponent).not.toHaveFocus();
    });

    it('Initializes panel description with default description from API', () => {
      api.defaultPanelDescription = new BehaviorSubject<string | undefined>('Default description');
      renderPanelEditor();
      expect(screen.getByTestId('customEmbeddablePanelDescriptionInput')).toHaveValue(
        'Default description'
      );
    });

    it('Initializes panel description with description from API', () => {
      setDescription('Very cool custom description');
      renderPanelEditor();
      expect(screen.getByTestId('customEmbeddablePanelDescriptionInput')).toHaveValue(
        'Very cool custom description'
      );
    });

    it('Sets panel description on apply', () => {
      renderPanelEditor();
      userEvent.type(
        screen.getByTestId('customEmbeddablePanelDescriptionInput'),
        'New description'
      );
      userEvent.click(screen.getByTestId('saveCustomizePanelButton'));
      expect(setDescription).toBeCalledWith('New description');
    });

    it('Resets panel desription to default when reset button is pressed', () => {
      api.defaultPanelDescription = new BehaviorSubject<string | undefined>('Default description');
      renderPanelEditor();
      userEvent.type(screen.getByTestId('customEmbeddablePanelDescriptionInput'), 'New desription');
      userEvent.click(screen.getByTestId('resetCustomEmbeddablePanelDescriptionButton'));
      expect(screen.getByTestId('customEmbeddablePanelDescriptionInput')).toHaveValue(
        'Default description'
      );
    });

    it('Reset panel description to undefined on apply', () => {
      setDescription('very cool description');
      renderPanelEditor();
      userEvent.click(screen.getByTestId('resetCustomEmbeddablePanelDescriptionButton'));
      userEvent.click(screen.getByTestId('saveCustomizePanelButton'));
      expect(setDescription).toBeCalledWith(undefined);
    });
  });

  describe('local time range', () => {
    it('renders local time picker if API supports it', async () => {
      api.timeRange$ = new BehaviorSubject<TimeRange | undefined>({
        from: '',
        to: '',
      });
      api.filters$ = new BehaviorSubject<Filter[] | undefined>([]);
      api.query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
      renderPanelEditor();

      const customTimeRangeComponent = await screen.findByTestId(
        'customizePanelTimeRangeDatePicker'
      );
      expect(customTimeRangeComponent).toBeDefined();
    });

    it('does not render custom time picker if API does not support it', async () => {
      renderPanelEditor();

      const customizePanelForm = await screen.findByTestId('customizePanelForm');
      const customTimeRangeComponent = screen.queryByTestId('customizePanelTimeRangeDatePicker');
      expect(customizePanelForm).not.toContainElement(customTimeRangeComponent);
    });
  });

  describe('local query & filters', () => {
    it('does not render local filters or query if API does not support it', async () => {
      renderPanelEditor();

      const customizePanelForm = await screen.findByTestId('customizePanelForm');
      const customPanelQuery = screen.queryByTestId('panelCustomQueryRow');
      expect(customizePanelForm).not.toContainElement(customPanelQuery);
      const customPanelFilters = screen.queryByTestId('panelCustomFiltersRow');
      expect(customizePanelForm).not.toContainElement(customPanelFilters);
    });

    test('renders local filters, if provided', async () => {
      api.timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
      api.filters$ = new BehaviorSubject<Filter[] | undefined>([
        {
          meta: {},
          query: {},
          $state: {},
        },
      ] as Filter[]);
      api.query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);

      renderPanelEditor();
      const customPanelQuery = await screen.findByTestId('panelCustomFiltersRow');
      expect(customPanelQuery).toBeInTheDocument();
    });

    test('renders a local query, if provided', async () => {
      api.timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
      api.filters$ = new BehaviorSubject<Filter[] | undefined>([]);
      api.query$ = new BehaviorSubject<Query | AggregateQuery | undefined>({
        query: 'field : value',
        language: 'kql',
      });

      renderPanelEditor();
      const customPanelQuery = await screen.findByTestId('panelCustomQueryRow');
      expect(customPanelQuery).toHaveTextContent('field : value');
    });
  });
});
