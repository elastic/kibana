/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useMemo, useCallback } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EuiSpacer, Query, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { ScopedHistory } from '@kbn/core-application-browser';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { UiCounterMetricType } from '@kbn/analytics';
import { url } from '@kbn/kibana-utils-plugin/common';
import { parse } from 'query-string';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import { CallOuts } from './components/call_outs';
import { AdvancedSettingsVoiceAnnouncement } from './components/advanced_settings_voice_announcement';
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

type GroupedSettings = Record<string, FieldSetting[]>;

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

  const settings = useMemo<FieldSetting[]>(() => {
    return mapConfig(uiSettings);
  }, [uiSettings]);

  const globalSettings = useMemo<FieldSetting[]>(() => {
    return mapConfig(globalUiSettings);
  }, [globalUiSettings]);

  const groupedSettings = useMemo<Record<UiSettingsScope, GroupedSettings>>(() => {
    return {
      namespace: mapSettings(settings),
      global: mapSettings(globalSettings),
    };
  }, [settings, globalSettings]);

  const categoryCounts = useMemo<Record<UiSettingsScope, Record<string, number>>>(() => {
    const initCategoryCounts = (grouped: GroupedSettings) => {
      return Object.keys(grouped).reduce((counts: Record<string, number>, category: string) => {
        counts[category] = grouped[category].length;
        return counts;
      }, {});
    };
    return {
      namespace: initCategoryCounts(groupedSettings.namespace),
      global: initCategoryCounts(groupedSettings.global),
    };
  }, [groupedSettings]);

  const categories = useMemo<Record<UiSettingsScope, string[]>>(() => {
    const initCategories = (grouped: GroupedSettings) => {
      return Object.keys(grouped).sort((a, b) => {
        if (a === DEFAULT_CATEGORY) return -1;
        if (b === DEFAULT_CATEGORY) return 1;
        if (a > b) return 1;
        return a === b ? 0 : -1;
      });
    };
    return {
      namespace: initCategories(groupedSettings.namespace),
      global: initCategories(groupedSettings.global),
    };
  }, [groupedSettings]);

  const [queryState, setQueryState] = useState<AdvancedSettingsState>({
    filteredSettings: {
      global: {},
      namespace: {},
    },
    footerQueryMatched: false,
    query: Query.parse(''),
  });

  useEffectOnce(() => {
    setQueryState(getQueryState(undefined, true));
    const uiSettingsSubscription = uiSettings.getUpdate$().subscribe(() => {
      const { query } = queryState;
      setQueryState({
        ...queryState,
        filteredSettings: {
          ...queryState.filteredSettings,
          namespace: mapSettings(Query.execute(query, settings)),
        },
      });
    });
    const globalUiSettingsSubscription = globalUiSettings.getUpdate$().subscribe(() => {
      const { query } = queryState;
      setQueryState({
        ...queryState,
        filteredSettings: {
          ...queryState.filteredSettings,
          global: mapSettings(Query.execute(query, globalSettings)),
        },
      });
    });
    const { hash } = window.location;
    if (hash !== '') {
      setTimeout(() => {
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
      }, 0);
    }
    return () => {
      history.listen(({ search }) => {
        setQueryState(getQueryState(search));
      });
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

  const getQuery = (queryString: string, initialQuery = false): Query => {
    try {
      const query = initialQuery ? getAriaName(queryString) : queryString ?? '';
      const res = Query.parse(query);
      return res;
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

  const PageTitle = componentRegistry.get(componentRegistry.componentType.PAGE_TITLE_COMPONENT);
  const PageSubtitle = componentRegistry.get(
    componentRegistry.componentType.PAGE_SUBTITLE_COMPONENT
  );
  const PageFooter = componentRegistry.get(componentRegistry.componentType.PAGE_FOOTER_COMPONENT);

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <PageTitle />
        </EuiFlexItem>
        <EuiFlexItem>
          <Search
            query={queryState.query}
            categories={categories.global.concat(categories.namespace)}
            onQueryChange={onQueryChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <PageSubtitle />
      <EuiSpacer size="m" />
      <CallOuts />
      <EuiSpacer size="m" />

      <AdvancedSettingsVoiceAnnouncement
        queryText={queryState.query.text}
        settings={queryState.filteredSettings.namespace}
      />

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
      <PageFooter
        toasts={props.toasts}
        query={queryState.query}
        onQueryMatchChange={onFooterQueryMatchChange}
        enableSaving={props.enableSaving}
      />
    </div>
  );
};
