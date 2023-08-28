/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback, useMemo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import {
  EuiSpacer,
  Query,
  EuiNotificationBadge,
  EuiTab,
  EuiTabs,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { ScopedHistory } from '@kbn/core-application-browser';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { UiCounterMetricType } from '@kbn/analytics';
import { url } from '@kbn/kibana-utils-plugin/common';
import { parse } from 'query-string';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import type { SectionRegistryStart } from '@kbn/management-settings-section-registry';
import type { RegistryEntry } from '@kbn/management-settings-section-registry';
import { mapConfig, mapSettings, initCategoryCounts, initCategories } from './settings_helper';
import { parseErrorMsg } from './components/search/search';
import { AdvancedSettings, QUERY } from './advanced_settings';
import { Search } from './components/search';
import { FieldSetting } from './types';
import { i18nTexts } from './i18n_texts';
import { getAriaName } from './lib';

interface AdvancedSettingsState {
  query: Query;
  filteredSettings: Record<UiSettingsScope, Record<string, FieldSetting[]>>;
  filteredSections: {
    global: RegistryEntry[];
    space: RegistryEntry[];
  };
}

export type GroupedSettings = Record<string, FieldSetting[]>;

interface Props {
  history: ScopedHistory;
  enableSaving: Record<UiSettingsScope, boolean>;
  enableShowing: Record<UiSettingsScope, boolean>;
  settingsService: SettingsStart;
  docLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  theme: ThemeServiceStart['theme$'];
  sectionRegistry: SectionRegistryStart;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}

const SPACE_SETTINGS_ID = 'space-settings';
const GLOBAL_SETTINGS_ID = 'global-settings';

export const Settings = (props: Props) => {
  const { sectionRegistry, history, settingsService, enableSaving, enableShowing, ...rest } = props;
  const uiSettings = settingsService.client;
  const globalUiSettings = settingsService.globalClient;

  const [settings, setSettings] = useState<FieldSetting[]>(mapConfig(uiSettings));
  const [globalSettings, setGlobalSettings] = useState<FieldSetting[]>(mapConfig(globalUiSettings));

  const [groupedSettings, setGroupedSettings] = useState<Record<UiSettingsScope, GroupedSettings>>({
    namespace: mapSettings(settings),
    global: mapSettings(globalSettings),
  });

  const [categoryCounts, setCategoryCounts] = useState<
    Record<UiSettingsScope, Record<string, number>>
  >({
    namespace: initCategoryCounts(groupedSettings.namespace),
    global: initCategoryCounts(groupedSettings.global),
  });

  const [categories, setCategories] = useState<Record<UiSettingsScope, string[]>>({
    namespace: initCategories(groupedSettings.namespace),
    global: initCategories(groupedSettings.global),
  });

  const [queryState, setQueryState] = useState<AdvancedSettingsState>({
    filteredSettings: {
      global: {},
      namespace: {},
    },
    filteredSections: {
      global: sectionRegistry.getGlobalSections(),
      space: sectionRegistry.getSpacesSections(),
    },
    query: Query.parse(''),
  });

  const setTimeoutCallback = () => {
    const { hash } = window.location;
    const id = hash.replace('#', '');
    const element = document.getElementById(id);

    let globalNavOffset = 0;

    const globalNavBars = document
      .getElementById('globalHeaderBars')
      ?.getElementsByClassName('euiHeader');

    if (globalNavBars) {
      Array.from(globalNavBars).forEach((navBar) => {
        globalNavOffset += (navBar as HTMLDivElement).offsetHeight;
      });
    }

    if (element) {
      element.scrollIntoView();
      window.scrollBy(0, -globalNavOffset); // offsets scroll by height of the global nav
    }
  };

  useEffectOnce(() => {
    setQueryState(getQueryState(undefined, true));

    const subscription = (mappedSettings: FieldSetting[], scope: UiSettingsScope) => {
      const grouped = { ...groupedSettings };
      grouped[scope] = mapSettings(mappedSettings);
      setGroupedSettings(grouped);

      const updatedCategories = { ...categories };
      updatedCategories[scope] = initCategories(groupedSettings[scope]);
      setCategories(updatedCategories);

      const updatedCategoryCounts = { ...categoryCounts };
      updatedCategoryCounts[scope] = initCategoryCounts(groupedSettings[scope]);
      setCategoryCounts(updatedCategoryCounts);
      const updatedQueryState = { ...getQueryState(undefined, true) };
      updatedQueryState.filteredSettings[scope] = mapSettings(
        Query.execute(updatedQueryState.query, mappedSettings)
      );
      setQueryState(updatedQueryState);
    };

    const uiSettingsSubscription = uiSettings.getUpdate$().subscribe(() => {
      const updatedSettings = mapConfig(uiSettings);
      setSettings(updatedSettings);
      subscription(updatedSettings, 'namespace');
    });
    const globalUiSettingsSubscription = globalUiSettings.getUpdate$().subscribe(() => {
      const mappedSettings = mapConfig(globalUiSettings);
      setGlobalSettings(mappedSettings);
      subscription(mappedSettings, 'global');
    });
    if (window.location.hash !== '') {
      setTimeout(() => setTimeoutCallback(), 0);
    }
    const unregister = history.listen(({ search }) => {
      setQueryState(getQueryState(search));
    });
    return () => {
      unregister();
      uiSettingsSubscription.unsubscribe();
      globalUiSettingsSubscription.unsubscribe();
    };
  });

  const setUrlQuery = useCallback(
    (query: string = '') => {
      const search = url.addQueryParam(window.location.search, QUERY, query);

      history.push({
        pathname: '', // remove any route query param
        search,
      });
    },
    [history]
  );

  const searchCategories = useMemo(() => {
    return categories.global.concat(categories.namespace);
  }, [categories.global, categories.namespace]);

  const callOutTitle = (scope: UiSettingsScope) => {
    if (scope === 'namespace') {
      return i18nTexts.defaultSpaceCalloutTitle;
    }
    return i18nTexts.globalCalloutTitle;
  };

  const callOutSubtitle = (scope: UiSettingsScope) => {
    if (scope === 'namespace') {
      return i18nTexts.defaultSpaceCalloutSubtitle;
    }
    return i18nTexts.globalCalloutSubtitle;
  };

  const getClientForScope = (scope: UiSettingsScope) => {
    if (scope === 'namespace') {
      return uiSettings;
    }
    return globalUiSettings;
  };

  const renderAdvancedSettings = (scope: UiSettingsScope) => {
    return (
      <AdvancedSettings
        groupedSettings={groupedSettings[scope]}
        categoryCounts={categoryCounts[scope]}
        categories={categories[scope]}
        visibleSettings={queryState.filteredSettings[scope]}
        clearQuery={() => setUrlQuery('')}
        noResults={
          queryState.filteredSections.global.length + queryState.filteredSections.space.length === 0
        }
        queryText={queryState.query.text}
        callOutTitle={callOutTitle(scope)}
        callOutSubtitle={callOutSubtitle(scope)}
        settingsService={settingsService}
        uiSettingsClient={getClientForScope(scope)}
        enableSaving={enableSaving[scope]}
        {...rest}
      />
    );
  };

  const tabs = [
    {
      id: SPACE_SETTINGS_ID,
      name: i18nTexts.defaultSpaceTabTitle,
      append:
        queryState.query.text !== '' ? (
          <EuiNotificationBadge className="eui-alignCenter" size="m" key="spaceSettings-badge">
            {Object.keys(queryState.filteredSettings.namespace).length +
              queryState.filteredSections.space.length}
          </EuiNotificationBadge>
        ) : null,
      content: renderAdvancedSettings('namespace'),
    },
  ];
  if (enableShowing.global) {
    tabs.push({
      id: GLOBAL_SETTINGS_ID,
      name: i18nTexts.globalTabTitle,
      append:
        queryState.query.text !== '' ? (
          <EuiNotificationBadge className="eui-alignCenter" size="m" key="spaceSettings-badge">
            {Object.keys(queryState.filteredSettings.global).length +
              queryState.filteredSections.global.length}
          </EuiNotificationBadge>
        ) : null,
      content: renderAdvancedSettings('global'),
    });
  }

  const [selectedTabId, setSelectedTabId] = useState(SPACE_SETTINGS_ID);

  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        data-test-subj={`advancedSettingsTab-${tab.id}`}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        append={tab.append}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  const getQuery = (queryString: string, initialQuery = false): Query => {
    try {
      const query = initialQuery ? getAriaName(queryString) : queryString ?? '';
      return Query.parse(query);
    } catch ({ message }) {
      props.toasts.addWarning({
        title: parseErrorMsg,
        text: message,
      });
      return Query.parse('');
    }
  };

  const getQueryText = (search?: string): string => {
    const queryParams = parse(search ?? window.location.search) ?? {};
    return (queryParams[QUERY] as string) ?? '';
  };

  const getQueryState = (search?: string, initialQuery = false): AdvancedSettingsState => {
    const queryString = getQueryText(search);
    const query = getQuery(queryString, initialQuery);
    const filteredSettings = {
      namespace: mapSettings(Query.execute(query, settings)),
      global: mapSettings(Query.execute(query, globalSettings)),
    };

    return {
      query,
      filteredSettings,
      filteredSections: {
        global: sectionRegistry
          .getGlobalSections()
          .filter(({ queryMatch }) => queryMatch(query.text)),
        space: sectionRegistry
          .getSpacesSections()
          .filter(({ queryMatch }) => queryMatch(query.text)),
      },
    };
  };

  const onQueryChange = useCallback(
    ({ query }: { query: Query }) => {
      setUrlQuery(query.text);
    },
    [setUrlQuery]
  );

  const PageTitle = (
    <EuiText>
      <h1 data-test-subj="managementSettingsTitle">{i18nTexts.advancedSettingsTitle}</h1>
    </EuiText>
  );

  const mapSections = (entries: RegistryEntry[]) =>
    entries.map(({ Component, queryMatch }, index) => {
      if (queryMatch(queryState.query.text)) {
        return (
          <Component
            key={`component-${index}`}
            toasts={props.toasts}
            enableSaving={props.enableSaving}
          />
        );
      }
      return null;
    });

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>{PageTitle}</EuiFlexItem>
        <EuiFlexItem>
          <Search
            query={queryState.query}
            categories={searchCategories}
            onQueryChange={onQueryChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
      {selectedTabId === SPACE_SETTINGS_ID ? (
        <>{mapSections(queryState.filteredSections.space)}</>
      ) : (
        <>{mapSections(queryState.filteredSections.global)}</>
      )}
    </div>
  );
};
