/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback, useMemo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EuiSpacer, Query, EuiNotificationBadge, EuiTab, EuiTabs } from '@elastic/eui';
import { ScopedHistory } from '@kbn/core-application-browser';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { UiCounterMetricType } from '@kbn/analytics';
import { url } from '@kbn/kibana-utils-plugin/common';
import { parse } from 'query-string';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import { PageTitle } from '../component_registry/page_title';
import { DEFAULT_CATEGORY, fieldSorter, getAriaName, toEditableConfig } from './lib';
import { parseErrorMsg } from './components/search/search';
import { AdvancedSettings, QUERY } from './advanced_settings';
import { ComponentRegistry } from '..';
import { Search } from './components/search';
import { FieldSetting } from './types';

interface AdvancedSettingsState {
  footerQueryMatched: boolean;
  query: Query;
  filteredSettings: Record<UiSettingsScope, Record<string, FieldSetting[]>>;
}

export type GroupedSettings = Record<string, FieldSetting[]>;

interface Props {
  history: ScopedHistory;
  enableSaving: boolean;
  uiSettings: IUiSettingsClient;
  globalUiSettings: IUiSettingsClient;
  docLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  theme: ThemeServiceStart['theme$'];
  componentRegistry: ComponentRegistry['start'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}

export const Settings = (props: Props) => {
  const { componentRegistry, history, toasts, uiSettings, globalUiSettings } = props;

  const mapConfig = (config: IUiSettingsClient) => {
    const all = config.getAll();
    return Object.entries(all)
      .map(([settingId, settingDef]) => {
        return toEditableConfig({
          def: settingDef,
          name: settingId,
          value: settingDef.userValue,
          isCustom: config.isCustom(settingId),
          isOverridden: config.isOverridden(settingId),
        });
      })
      .filter((c) => !c.readOnly)
      .filter((c) => !c.isCustom) // hide any settings that aren't explicitly registered by enabled plugins.
      .sort(fieldSorter);
  };

  const mapSettings = (fieldSettings: FieldSetting[]) => {
    // Group settings by category
    return fieldSettings.reduce((grouped: GroupedSettings, setting) => {
      // We will want to change this logic when we put each category on its
      // own page aka allowing a setting to be included in multiple categories.
      const category = setting.category[0];
      (grouped[category] = grouped[category] || []).push(setting);
      return grouped;
    }, {});
  };

  const initCategoryCounts = (grouped: GroupedSettings) => {
    return Object.keys(grouped).reduce((counts: Record<string, number>, category: string) => {
      counts[category] = grouped[category].length;
      return counts;
    }, {});
  };

  const initCategories = (grouped: GroupedSettings) => {
    return Object.keys(grouped).sort((a, b) => {
      if (a === DEFAULT_CATEGORY) return -1;
      if (b === DEFAULT_CATEGORY) return 1;
      if (a > b) return 1;
      return a === b ? 0 : -1;
    });
  };

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
    footerQueryMatched: false,
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

  const tabs = useMemo(() => {
    return [
      {
        id: 'advanced-settings',
        name: 'Advanced Settings',
        append: (
          <EuiNotificationBadge className="eui-alignCenter" size="m">
            {Object.keys(queryState.filteredSettings).length}
          </EuiNotificationBadge>
        ),
        content: (
          <AdvancedSettings
            settings={settings}
            groupedSettings={groupedSettings.namespace}
            categoryCounts={categoryCounts.namespace}
            categories={categories.namespace}
            visibleSettings={queryState.filteredSettings.namespace}
            clearQuery={() => setUrlQuery('')}
            noResults={!queryState.footerQueryMatched}
            queryText={queryState.query.text}
            {...props}
          />
        ),
      },
      {
        id: 'global-settings',
        name: 'Global Settings',
        append: (
          <EuiNotificationBadge className="eui-alignCenter" size="m">
            {19}
          </EuiNotificationBadge>
        ),
        content: (
          <AdvancedSettings
            settings={globalSettings}
            groupedSettings={groupedSettings.global}
            categoryCounts={categoryCounts.global}
            categories={categories.global}
            visibleSettings={queryState.filteredSettings.global}
            clearQuery={() => setUrlQuery('')}
            noResults={!queryState.footerQueryMatched}
            queryText={queryState.query.text}
            {...props}
          />
        ),
      },
    ];
  }, [
    categories.global,
    categories.namespace,
    categoryCounts.global,
    categoryCounts.namespace,
    globalSettings,
    groupedSettings.global,
    groupedSettings.namespace,
    props,
    queryState.filteredSettings,
    queryState.footerQueryMatched,
    queryState.query.text,
    setUrlQuery,
    settings,
  ]);

  const [selectedTabId, setSelectedTabId] = useState('advanced-settings');

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
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
      toasts.addWarning({
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

  const getQueryState = (search?: string, intialQuery = false): AdvancedSettingsState => {
    const queryString = getQueryText(search);
    const query = getQuery(queryString, intialQuery);
    const filteredSettings = {
      namespace: mapSettings(Query.execute(query, settings)),
      global: mapSettings(Query.execute(query, globalSettings)),
    };
    const footerQueryMatched = Object.keys(filteredSettings.namespace).length > 0;

    return {
      query,
      filteredSettings,
      footerQueryMatched,
    };
  };

  const onQueryChange = ({ query }: { query: Query }) => {
    setUrlQuery(query.text);
  };

  const onFooterQueryMatchChange = (matched: boolean) => {
    setQueryState({ ...queryState, footerQueryMatched: matched });
  };

  const PageFooter = componentRegistry.get(componentRegistry.componentType.PAGE_FOOTER_COMPONENT);

  return (
    <div>
      <Search
        query={queryState.query}
        categories={categories.global.concat(categories.namespace)}
        onQueryChange={onQueryChange}
      />
      <EuiSpacer size="m" />
      <PageTitle title={'Advanced Settings'} />
      <EuiSpacer size="m" />
      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
      <PageFooter
        toasts={props.toasts}
        query={queryState.query}
        onQueryMatchChange={onFooterQueryMatchChange}
        enableSaving={props.enableSaving}
      />
    </div>
  );
};
