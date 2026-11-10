/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import type {
  IUiSettingsMetadataClient,
  UiSettingsMetadataState,
} from '@kbn/core-ui-settings-browser';
import {
  SettingsApplication,
  DATA_TEST_SUBJ_SETTINGS_TITLE,
  DATA_TEST_SUBJ_SETTINGS_LOAD_ERROR,
  DATA_TEST_SUBJ_SETTINGS_LOADING,
  SPACE_SETTINGS_TAB_ID,
  GLOBAL_SETTINGS_TAB_ID,
} from './application';
import {
  DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR,
  DATA_TEST_SUBJ_DISABLED_CATEGORY_FILTER,
} from './query_input';
import {
  DATA_TEST_SUBJ_SETTINGS_EMPTY_STATE,
  DATA_TEST_SUBJ_SETTINGS_CLEAR_SEARCH_LINK,
} from './empty_state';
import { DATA_TEST_SUBJ_PREFIX_TAB } from './tab';
import { DATA_TEST_SUBJ_SETTINGS_CATEGORY } from '@kbn/management-settings-components-field-category/category';
import { DATA_TEST_SUBJ_SAVE_BUTTON } from '@kbn/management-settings-components-form/bottom_bar/bottom_bar';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
import type { UiSettingMetadata } from '@kbn/management-settings-types';
import { getSettingsMock } from '@kbn/management-settings-utilities/mocks/settings.mock';
import { getSettingsCapabilitiesMock } from '@kbn/management-settings-utilities/mocks/capabilities.mock';
import { wrap, createSettingsApplicationServicesMock } from './mocks';
import type { SettingsApplicationServices } from './services';
import { SettingsApplicationKibanaProvider } from './services';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import type { Space } from '@kbn/spaces-plugin/common';
import {
  analyticsServiceMock,
  applicationServiceMock,
  chromeServiceMock,
  docLinksServiceMock,
  i18nServiceMock,
  notificationServiceMock,
  scopedHistoryMock,
  themeServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/public/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';

const spaceCategories = ['general', 'dashboard', 'notifications'];
const globalCategories = ['custom branding'];

const createRootMock = () => {
  return {
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    i18n: i18nServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    userProfile: userProfileServiceMock.createStart(),
  };
};

const renderWithKibanaProvider = ({
  history = scopedHistoryMock.create({ pathname: '', search: '' }),
  client = uiSettingsServiceMock.createStartContract(),
  metadata = { getAll: jest.fn().mockResolvedValue({}) },
}: {
  history?: ReturnType<typeof scopedHistoryMock.create>;
  client?: ReturnType<typeof uiSettingsServiceMock.createStartContract>;
  metadata?: IUiSettingsMetadataClient;
} = {}) => {
  const activeSpace: Space = {
    id: asSpaceId('default'),
    name: 'Default',
    disabledFeatures: [],
    solution: 'classic',
  };
  const application = applicationServiceMock.createStartContract();
  application.capabilities = {
    advancedSettings: { show: true, save: true },
    globalSettings: { show: true, save: true },
    filterSettings: { bySolutionView: false },
  } as any;

  return render(
    <KibanaRootContextProvider {...createRootMock()}>
      <SettingsApplicationKibanaProvider
        docLinks={docLinksServiceMock.createStartContract()}
        notifications={{ toasts: notificationServiceMock.createStartContract().toasts }}
        userProfile={userProfileServiceMock.createStart()}
        theme={themeServiceMock.createStartContract()}
        i18n={i18nServiceMock.createStartContract()}
        settings={{
          client,
          globalClient: uiSettingsServiceMock.createStartContract(),
          metadata,
        }}
        history={history}
        sectionRegistry={{
          getSpacesSections: () => [],
          getGlobalSections: () => [],
        }}
        application={application}
        chrome={chromeServiceMock.createStartContract()}
        spaces={{
          getActiveSpace: () => Promise.resolve(activeSpace),
          getActiveSpace$: () => of(activeSpace),
        }}
      >
        <SettingsApplication />
      </SettingsApplicationKibanaProvider>
    </KibanaRootContextProvider>
  );
};

describe('Settings application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', async () => {
    const { container, findByTestId, getByTestId } = render(wrap(<SettingsApplication />));

    expect(container).toBeInTheDocument();
    expect(await findByTestId(DATA_TEST_SUBJ_SETTINGS_TITLE)).toBeInTheDocument();
    expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR)).toBeInTheDocument();
    // Verify that all category panels are rendered
    for (const category of spaceCategories) {
      expect(getByTestId(`${DATA_TEST_SUBJ_SETTINGS_CATEGORY}-${category}`)).toBeInTheDocument();
    }
  });

  it('shows a spinner and disables the search and category filter while the settings load', async () => {
    const resolvers: Array<(value: Record<string, never>) => void> = [];
    const services: SettingsApplicationServices = {
      ...createSettingsApplicationServicesMock(),
      getAllowlistedSettings: () =>
        new Promise<Record<string, never>>((resolve) => {
          resolvers.push(resolve);
        }),
    };

    const { findByTestId, getByTestId, queryByTestId } = render(
      wrap(<SettingsApplication />, services)
    );

    expect(await findByTestId(DATA_TEST_SUBJ_SETTINGS_TITLE)).toBeInTheDocument();
    expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_LOADING)).toBeInTheDocument();
    expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR)).toBeDisabled();
    expect(getByTestId(DATA_TEST_SUBJ_DISABLED_CATEGORY_FILTER)).toBeDisabled();

    await act(async () => {
      resolvers.forEach((resolve) => resolve({}));
    });

    await waitFor(() => expect(queryByTestId(DATA_TEST_SUBJ_SETTINGS_LOADING)).toBeNull());
    expect(getByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR)).toBeEnabled();
    expect(queryByTestId(DATA_TEST_SUBJ_DISABLED_CATEGORY_FILTER)).toBeNull();
  });

  it('shows an error instead of the form when the settings fail to load', async () => {
    const services: SettingsApplicationServices = {
      ...createSettingsApplicationServicesMock(),
      getAllowlistedSettings: () => Promise.reject(new Error('Internal Server Error')),
    };

    const { findByTestId, queryByTestId } = render(wrap(<SettingsApplication />, services));

    const loadError = await findByTestId(DATA_TEST_SUBJ_SETTINGS_LOAD_ERROR);
    expect(loadError).toHaveTextContent('Unable to load advanced settings');
    expect(loadError).toHaveTextContent('Internal Server Error');
    expect(queryByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR)).toBeNull();
  });

  it("doesn't fetch the global settings when they can't be shown", async () => {
    const getAllowlistedSettings = jest.fn((scope: UiSettingsScope) =>
      scope === 'global'
        ? Promise.reject(new Error('Forbidden'))
        : Promise.resolve(getSettingsMock())
    );
    const services: SettingsApplicationServices = {
      ...createSettingsApplicationServicesMock(),
      getAllowlistedSettings,
      getCapabilities: () => ({
        ...getSettingsCapabilitiesMock(),
        globalSettings: { show: false, save: false },
      }),
    };

    const { findByTestId, queryByTestId } = render(wrap(<SettingsApplication />, services));

    for (const category of spaceCategories) {
      expect(
        await findByTestId(`${DATA_TEST_SUBJ_SETTINGS_CATEGORY}-${category}`)
      ).toBeInTheDocument();
    }
    expect(queryByTestId(DATA_TEST_SUBJ_SETTINGS_LOAD_ERROR)).toBeNull();
    expect(getAllowlistedSettings.mock.calls.map(([scope]) => scope)).not.toContain('global');
  });

  it('requests the setting definitions once per scope and shows saved values from the client', async () => {
    const update$ = new Subject<{ key: string; newValue: unknown; oldValue: unknown }>();
    const client = uiSettingsServiceMock.createStartContract();
    client.getUpdate$.mockReturnValue(update$);
    client.getAll.mockReturnValue({
      'test:setting': {
        name: 'Test setting',
        type: 'string',
        value: 'default',
        userValue: 'saved',
      },
    });
    const namespaceDefinitions: UiSettingsMetadataState = {
      'test:setting': {
        name: 'Test setting',
        description: 'A setting with display metadata',
        type: 'string',
        value: 'default',
        userValue: 'saved',
      },
    };
    const metadata = {
      getAll: jest.fn(async (scope: 'namespace' | 'global') =>
        scope === 'namespace' ? namespaceDefinitions : {}
      ),
    };

    const { findByDisplayValue, getByText } = renderWithKibanaProvider({ client, metadata });

    expect(await findByDisplayValue('saved')).toBeInTheDocument();
    expect(getByText('A setting with display metadata')).toBeInTheDocument();
    expect(metadata.getAll).toHaveBeenCalledTimes(2);
    expect(metadata.getAll).toHaveBeenCalledWith('namespace');
    expect(metadata.getAll).toHaveBeenCalledWith('global');

    client.getAll.mockReturnValue({
      'test:setting': { name: 'Test setting', type: 'string', value: 'default', userValue: 'new' },
    });
    act(() => {
      update$.next({ key: 'test:setting', newValue: 'new', oldValue: 'saved' });
    });

    expect(await findByDisplayValue('new')).toBeInTheDocument();
    expect(metadata.getAll).toHaveBeenCalledTimes(2);
  });

  it('replaces history while typing so browser back does not step through each character', async () => {
    const history = scopedHistoryMock.create({ pathname: '', search: '' });

    const { findByTestId } = renderWithKibanaProvider({ history });

    const searchBar = await findByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR);

    // Simulate typing characters one at a time, as a user would.
    const valuesByKeystroke = ['t', 'te', 'tes', 'test'];
    for (const value of valuesByKeystroke) {
      act(() => {
        fireEvent.change(searchBar, { target: { value } });
      });
    }

    await waitFor(() => {
      expect(history.push).not.toHaveBeenCalled();
      expect(history.replace).toHaveBeenCalledTimes(valuesByKeystroke.length);
      expect(history.replace).toHaveBeenNthCalledWith(1, { pathname: '', search: '?query=t' });
      expect(history.replace).toHaveBeenNthCalledWith(2, { pathname: '', search: '?query=te' });
      expect(history.replace).toHaveBeenNthCalledWith(3, { pathname: '', search: '?query=tes' });
      expect(history.replace).toHaveBeenNthCalledWith(4, { pathname: '', search: '?query=test' });
    });
  });

  it('renders the empty state when no settings match the query', async () => {
    const { findByTestId, getByTestId } = render(wrap(<SettingsApplication />));

    const searchBar = await findByTestId(DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR);
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

  it("doesn't render settings that are not applicable in the current solution", async () => {
    const services: SettingsApplicationServices = createSettingsApplicationServicesMock(
      undefined,
      ['classic', 'es'],
      'security'
    );

    const { findByTestId } = render(wrap(<SettingsApplication />, services));

    // The empty state should be rendered since all settings are for es solution and current space solution is security
    expect(findByTestId(DATA_TEST_SUBJ_SETTINGS_EMPTY_STATE)).toBeTruthy();
  });

  it('renders settings that are applicable in the current solution', async () => {
    const services: SettingsApplicationServices = createSettingsApplicationServicesMock(
      undefined,
      ['classic', 'oblt'],
      'oblt'
    );

    const { findByTestId, getByTestId } = render(wrap(<SettingsApplication />, services));

    // The form should be rendered
    expect(await findByTestId(DATA_TEST_SUBJ_SETTINGS_TITLE)).toBeInTheDocument();
    for (const category of spaceCategories) {
      expect(getByTestId(`${DATA_TEST_SUBJ_SETTINGS_CATEGORY}-${category}`)).toBeInTheDocument();
    }
  });

  describe('Tabs', () => {
    const spaceSettingsTestSubj = `${DATA_TEST_SUBJ_PREFIX_TAB}-${SPACE_SETTINGS_TAB_ID}`;
    const globalSettingsTestSubj = `${DATA_TEST_SUBJ_PREFIX_TAB}-${GLOBAL_SETTINGS_TAB_ID}`;

    it("doesn't render tabs when there are no global settings", async () => {
      const services: SettingsApplicationServices = createSettingsApplicationServicesMock(false);

      const { container, findByTestId, queryByTestId } = render(
        wrap(<SettingsApplication />, services)
      );

      expect(container).toBeInTheDocument();
      expect(await findByTestId(DATA_TEST_SUBJ_SETTINGS_TITLE)).toBeInTheDocument();
      expect(queryByTestId(spaceSettingsTestSubj)).toBeNull();
      expect(queryByTestId(globalSettingsTestSubj)).toBeNull();
    });

    it('renders tabs when global settings are enabled', async () => {
      const services: SettingsApplicationServices = createSettingsApplicationServicesMock(true);

      const { container, findByTestId, getByTestId } = render(
        wrap(<SettingsApplication />, services)
      );

      expect(container).toBeInTheDocument();
      expect(await findByTestId(spaceSettingsTestSubj)).toBeInTheDocument();
      expect(getByTestId(globalSettingsTestSubj)).toBeInTheDocument();
    });

    it('can switch between tabs', async () => {
      const services: SettingsApplicationServices = createSettingsApplicationServicesMock(true);

      const { findByTestId, getByTestId } = render(wrap(<SettingsApplication />, services));

      const spaceTab = await findByTestId(spaceSettingsTestSubj);
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

    it('saves space settings when the selected Global tab goes away because there are no global settings', async () => {
      const resolvers: Array<() => void> = [];
      const services: SettingsApplicationServices = {
        ...createSettingsApplicationServicesMock(),
        getAllowlistedSettings: (scope: UiSettingsScope) =>
          new Promise<Record<string, UiSettingMetadata>>((resolve) => {
            resolvers.push(() => resolve(scope === 'namespace' ? getSettingsMock() : {}));
          }),
      };

      const { findByTestId, findByDisplayValue, queryByTestId } = render(
        wrap(<SettingsApplication />, services)
      );

      const globalTab = await findByTestId(globalSettingsTestSubj);
      act(() => {
        fireEvent.click(globalTab);
      });
      await act(async () => {
        resolvers.forEach((resolve) => resolve());
      });

      await waitFor(() => expect(queryByTestId(globalSettingsTestSubj)).toBeNull());
      const input = await findByDisplayValue('hello world');
      act(() => {
        fireEvent.change(input, { target: { value: 'test' } });
      });
      const saveButton = await findByTestId(DATA_TEST_SUBJ_SAVE_BUTTON);
      act(() => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(services.saveChanges).toHaveBeenCalledWith({
          string: expect.objectContaining({ unsavedValue: 'test', scope: 'namespace' }),
        });
      });
    });
  });
});
