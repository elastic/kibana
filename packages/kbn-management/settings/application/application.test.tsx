/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import {
  SettingsApplication,
  DATA_TEST_SUBJ_SETTINGS_TITLE,
  SPACE_SETTINGS_TAB_ID,
  GLOBAL_SETTINGS_TAB_ID,
} from './application';
import { DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR } from './query_input';
import {
  DATA_TEST_SUBJ_SETTINGS_EMPTY_STATE,
  DATA_TEST_SUBJ_SETTINGS_CLEAR_SEARCH_LINK,
} from './empty_state';
import { DATA_TEST_SUBJ_PREFIX_TAB } from './tab';
import { DATA_TEST_SUBJ_SETTINGS_CATEGORY } from '@kbn/management-settings-components-field-category/category';
import { wrap, createSettingsApplicationServicesMock } from './mocks';
import { SettingsApplicationServices } from './services';

const spaceCategories = ['general', 'dashboard', 'notifications'];
const globalCategories = ['custom branding'];

describe('Settings application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    const { container, getByTestId } = render(wrap(<SettingsApplication />));

    expect(container).toBeInTheDocument();
    expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_TITLE)).toBeInTheDocument();
    expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR)).toBeInTheDocument();
    // Verify that all category panels are rendered
    for (const category of spaceCategories) {
      expect(getByTestId(`${DATA_TEST_SUBJ_SETTINGS_CATEGORY}-${category}`)).toBeInTheDocument();
    }
  });

  it('fires addUrlToHistory when a query is typed in the search bar', async () => {
    const services: SettingsApplicationServices = createSettingsApplicationServicesMock();

    const { getByTestId } = render(wrap(<SettingsApplication />, services));

    const searchBar = getByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR);
    act(() => {
      fireEvent.change(searchBar, { target: { value: 'test' } });
    });

    await waitFor(() => {
      expect(services.addUrlToHistory).toHaveBeenCalledWith('?query=test');
    });
  });

  it('renders the empty state when no settings match the query', async () => {
    const { getByTestId } = render(wrap(<SettingsApplication />));

    const searchBar = getByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR);
    act(() => {
      fireEvent.change(searchBar, { target: { value: 'some-random-text' } });
    });

    expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_EMPTY_STATE)).toBeInTheDocument();

    // Clicking the "clear search" link should return the form back
    const clearSearchLink = getByTestId(DATA_TEST_SUBJ_SETTINGS_CLEAR_SEARCH_LINK);
    act(() => {
      fireEvent.click(clearSearchLink);
    });

    for (const category of spaceCategories) {
      expect(getByTestId(`${DATA_TEST_SUBJ_SETTINGS_CATEGORY}-${category}`)).toBeInTheDocument();
    }
  });

  describe('Tabs', () => {
    const spaceSettingsTestSubj = `${DATA_TEST_SUBJ_PREFIX_TAB}-${SPACE_SETTINGS_TAB_ID}`;
    const globalSettingsTestSubj = `${DATA_TEST_SUBJ_PREFIX_TAB}-${GLOBAL_SETTINGS_TAB_ID}`;

    it("doesn't render tabs when there are no global settings", () => {
      const services: SettingsApplicationServices = createSettingsApplicationServicesMock(false);

      const { container, queryByTestId } = render(wrap(<SettingsApplication />, services));

      expect(container).toBeInTheDocument();
      expect(queryByTestId(spaceSettingsTestSubj)).toBeNull();
      expect(queryByTestId(globalSettingsTestSubj)).toBeNull();
    });

    it('renders tabs when global settings are enabled', () => {
      const services: SettingsApplicationServices = createSettingsApplicationServicesMock(true);

      const { container, getByTestId } = render(wrap(<SettingsApplication />, services));

      expect(container).toBeInTheDocument();
      expect(getByTestId(spaceSettingsTestSubj)).toBeInTheDocument();
      expect(getByTestId(globalSettingsTestSubj)).toBeInTheDocument();
    });

    it('can switch between tabs', () => {
      const services: SettingsApplicationServices = createSettingsApplicationServicesMock(true);

      const { getByTestId } = render(wrap(<SettingsApplication />, services));

      const spaceTab = getByTestId(spaceSettingsTestSubj);
      const globalTab = getByTestId(globalSettingsTestSubj);

      // Initially the Space tab should be selected
      expect(spaceTab.className).toContain('selected');
      expect(globalTab.className).not.toContain('selected');

      act(() => {
        fireEvent.click(globalTab);
      });

      expect(spaceTab.className).not.toContain('selected');
      expect(globalTab.className).toContain('selected');

      // Should render the page correctly with the Global tab selected
      expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_TITLE)).toBeInTheDocument();
      expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR)).toBeInTheDocument();
      // Verify that all category panels are rendered
      for (const category of globalCategories) {
        expect(getByTestId(`${DATA_TEST_SUBJ_SETTINGS_CATEGORY}-${category}`)).toBeInTheDocument();
      }
    });
  });
});
