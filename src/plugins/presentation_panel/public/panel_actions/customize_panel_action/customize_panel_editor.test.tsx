/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  let setTitle: (title?: string) => void;
  let setViewMode: (viewMode: ViewMode) => void;
  let setDescription: (description?: string) => void;

  beforeEach(() => {
    const titleSubject = new BehaviorSubject<string | undefined>(undefined);
    setTitle = jest.fn((title) => titleSubject.next(title));
    const descriptionSubject = new BehaviorSubject<string | undefined>(undefined);
    setDescription = jest.fn((description) => descriptionSubject.next(description));
    const viewMode = new BehaviorSubject<ViewMode>('edit');
    setViewMode = jest.fn((nextViewMode) => viewMode.next(nextViewMode));

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

    it('should set panel title on apply', () => {
      renderPanelEditor();
      userEvent.type(screen.getByTestId('customEmbeddablePanelTitleInput'), 'New title');
      userEvent.click(screen.getByTestId('saveCustomizePanelButton'));
      expect(setTitle).toBeCalledWith('New title');
    });

    it('should use default title when title is undefined', () => {
      api.defaultPanelTitle = new BehaviorSubject<string | undefined>('Default title');
      setTitle(undefined);
      renderPanelEditor();
      const titleInput = screen.getByTestId('customEmbeddablePanelTitleInput');
      expect(titleInput).toHaveValue('Default title');
    });

    it('should use title even when empty string', () => {
      api.defaultPanelTitle = new BehaviorSubject<string | undefined>('Default title');
      setTitle('');
      renderPanelEditor();
      const titleInput = screen.getByTestId('customEmbeddablePanelTitleInput');
      expect(titleInput).toHaveValue('');
    });

    it('Resets panel title to default when reset button is pressed', () => {
      api.defaultPanelTitle = new BehaviorSubject<string | undefined>('Default title');
      setTitle('Initial title');
      renderPanelEditor();
      userEvent.type(screen.getByTestId('customEmbeddablePanelTitleInput'), 'New title');
      userEvent.click(screen.getByTestId('resetCustomEmbeddablePanelTitleButton'));
      expect(screen.getByTestId('customEmbeddablePanelTitleInput')).toHaveValue('Default title');
    });

    it('should hide title reset when no default exists', () => {
      api.defaultPanelTitle = new BehaviorSubject<string | undefined>(undefined);
      setTitle('Initial title');
      renderPanelEditor();
      userEvent.type(screen.getByTestId('customEmbeddablePanelTitleInput'), 'New title');
      expect(screen.queryByTestId('resetCustomEmbeddablePanelTitleButton')).not.toBeInTheDocument();
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

    it('should set panel description on apply', () => {
      renderPanelEditor();
      userEvent.type(
        screen.getByTestId('customEmbeddablePanelDescriptionInput'),
        'New description'
      );
      userEvent.click(screen.getByTestId('saveCustomizePanelButton'));
      expect(setDescription).toBeCalledWith('New description');
    });

    it('should use default description when description is undefined', () => {
      api.defaultPanelDescription = new BehaviorSubject<string | undefined>('Default description');
      setDescription(undefined);
      renderPanelEditor();
      const descriptionInput = screen.getByTestId('customEmbeddablePanelDescriptionInput');
      expect(descriptionInput).toHaveValue('Default description');
    });

    it('should use description even when empty string', () => {
      api.defaultPanelDescription = new BehaviorSubject<string | undefined>('Default description');
      setDescription('');
      renderPanelEditor();
      const descriptionInput = screen.getByTestId('customEmbeddablePanelDescriptionInput');
      expect(descriptionInput).toHaveValue('');
    });

    it('Resets panel description to default when reset button is pressed', () => {
      api.defaultPanelDescription = new BehaviorSubject<string | undefined>('Default description');
      setDescription('Initial description');
      renderPanelEditor();
      userEvent.type(
        screen.getByTestId('customEmbeddablePanelDescriptionInput'),
        'New description'
      );
      userEvent.click(screen.getByTestId('resetCustomEmbeddablePanelDescriptionButton'));
      expect(screen.getByTestId('customEmbeddablePanelDescriptionInput')).toHaveValue(
        'Default description'
      );
    });

    it('should hide description reset when no default exists', () => {
      api.defaultPanelDescription = new BehaviorSubject<string | undefined>(undefined);
      setDescription('Initial description');
      renderPanelEditor();
      userEvent.type(
        screen.getByTestId('customEmbeddablePanelDescriptionInput'),
        'New description'
      );
      expect(
        screen.queryByTestId('resetCustomEmbeddablePanelDescriptionButton')
      ).not.toBeInTheDocument();
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
