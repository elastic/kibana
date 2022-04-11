/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { Subscription } from 'rxjs';
import { UnregisterCallback } from 'history';
import { parse } from 'query-string';

import { UiCounterMetricType } from '@kbn/analytics';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, Query } from '@elastic/eui';

import {
  IUiSettingsClient,
  DocLinksStart,
  ToastsStart,
  ScopedHistory,
  ThemeServiceStart,
} from '../../../../core/public';
import { url } from '../../../kibana_utils/public';

import { CallOuts } from './components/call_outs';
import { Search } from './components/search';
import { Form } from './components/form';
import { AdvancedSettingsVoiceAnnouncement } from './components/advanced_settings_voice_announcement';
import { ComponentRegistry } from '../';

import { getAriaName, toEditableConfig, fieldSorter, DEFAULT_CATEGORY } from './lib';

import { FieldSetting, SettingsChanges } from './types';
import { parseErrorMsg } from './components/search/search';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

export const QUERY = 'query';

interface AdvancedSettingsProps {
  history: ScopedHistory;
  enableSaving: boolean;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  theme: ThemeServiceStart['theme$'];
  componentRegistry: ComponentRegistry['start'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}

interface AdvancedSettingsState {
  footerQueryMatched: boolean;
  query: Query;
  filteredSettings: Record<string, FieldSetting[]>;
}

type GroupedSettings = Record<string, FieldSetting[]>;

export class AdvancedSettings extends Component<AdvancedSettingsProps, AdvancedSettingsState> {
  private settings: FieldSetting[];
  private groupedSettings: GroupedSettings;
  private categoryCounts: Record<string, number>;
  private categories: string[] = [];
  private uiSettingsSubscription?: Subscription;
  private unregister: UnregisterCallback;

  constructor(props: AdvancedSettingsProps) {
    super(props);

    this.settings = this.initSettings(this.props.uiSettings);
    this.groupedSettings = this.initGroupedSettings(this.settings);
    this.categories = this.initCategories(this.groupedSettings);
    this.categoryCounts = this.initCategoryCounts(this.groupedSettings);
    this.state = this.getQueryState(undefined, true);
    this.unregister = this.props.history.listen(({ search }) => {
      this.setState(this.getQueryState(search));
    });
  }

  init(config: IUiSettingsClient) {
    this.settings = this.initSettings(config);
    this.groupedSettings = this.initGroupedSettings(this.settings);
    this.categories = this.initCategories(this.groupedSettings);
    this.categoryCounts = this.initCategoryCounts(this.groupedSettings);
  }

  initSettings = this.mapConfig;
  initGroupedSettings = this.mapSettings;
  initCategories(groupedSettings: GroupedSettings) {
    return Object.keys(groupedSettings).sort((a, b) => {
      if (a === DEFAULT_CATEGORY) return -1;
      if (b === DEFAULT_CATEGORY) return 1;
      if (a > b) return 1;
      return a === b ? 0 : -1;
    });
  }
  initCategoryCounts(groupedSettings: GroupedSettings) {
    return Object.keys(groupedSettings).reduce(
      (counts: Record<string, number>, category: string) => {
        counts[category] = groupedSettings[category].length;
        return counts;
      },
      {}
    );
  }

  componentDidMount() {
    this.uiSettingsSubscription = this.props.uiSettings.getUpdate$().subscribe(() => {
      const { query } = this.state;
      this.init(this.props.uiSettings);
      this.setState({
        filteredSettings: this.mapSettings(Query.execute(query, this.settings)),
      });
    });

    // scrolls to setting provided in the URL hash
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
  }

  componentWillUnmount() {
    this.uiSettingsSubscription?.unsubscribe?.();
    this.unregister?.();
  }

  private getQuery(queryString: string, intialQuery = false): Query {
    try {
      const query = intialQuery ? getAriaName(queryString) : queryString ?? '';
      return Query.parse(query);
    } catch ({ message }) {
      this.props.toasts.addWarning({
        title: parseErrorMsg,
        text: message,
      });
      return Query.parse('');
    }
  }

  private getQueryText(search?: string): string {
    const queryParams = parse(search ?? window.location.search) ?? {};
    return (queryParams[QUERY] as string) ?? '';
  }

  private getQueryState(search?: string, intialQuery = false): AdvancedSettingsState {
    const queryString = this.getQueryText(search);
    const query = this.getQuery(queryString, intialQuery);
    const filteredSettings = this.mapSettings(Query.execute(query, this.settings));
    const footerQueryMatched = Object.keys(filteredSettings).length > 0;

    return {
      query,
      filteredSettings,
      footerQueryMatched,
    };
  }

  setUrlQuery(q: string = '') {
    const search = url.addQueryParam(window.location.search, QUERY, q);

    this.props.history.push({
      pathname: '', // remove any route query param
      search,
    });
  }

  mapConfig(config: IUiSettingsClient) {
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
  }

  mapSettings(settings: FieldSetting[]) {
    // Group settings by category
    return settings.reduce((groupedSettings: GroupedSettings, setting) => {
      // We will want to change this logic when we put each category on its
      // own page aka allowing a setting to be included in multiple categories.
      const category = setting.category[0];
      (groupedSettings[category] = groupedSettings[category] || []).push(setting);
      return groupedSettings;
    }, {});
  }

  onQueryChange = ({ query }: { query: Query }) => {
    this.setUrlQuery(query.text);
  };

  clearQuery = () => {
    this.setUrlQuery('');
  };

  onFooterQueryMatchChange = (matched: boolean) => {
    this.setState({
      footerQueryMatched: matched,
    });
  };

  saveConfig = async (changes: SettingsChanges) => {
    const arr = Object.entries(changes).map(([key, value]) =>
      this.props.uiSettings.set(key, value)
    );
    return Promise.all(arr);
  };

  render() {
    const { filteredSettings, query, footerQueryMatched } = this.state;
    const componentRegistry = this.props.componentRegistry;

    const PageTitle = componentRegistry.get(componentRegistry.componentType.PAGE_TITLE_COMPONENT);
    const PageSubtitle = componentRegistry.get(
      componentRegistry.componentType.PAGE_SUBTITLE_COMPONENT
    );
    const PageFooter = componentRegistry.get(componentRegistry.componentType.PAGE_FOOTER_COMPONENT);

    return (
      <div>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <PageTitle />
          </EuiFlexItem>
          <EuiFlexItem>
            <Search query={query} categories={this.categories} onQueryChange={this.onQueryChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <PageSubtitle />
        <EuiSpacer size="m" />
        <CallOuts />
        <EuiSpacer size="m" />

        <AdvancedSettingsVoiceAnnouncement queryText={query.text} settings={filteredSettings} />

        <KibanaContextProvider services={{ uiSettings: this.props.uiSettings }}>
          <Form
            settings={this.groupedSettings}
            visibleSettings={filteredSettings}
            categories={this.categories}
            categoryCounts={this.categoryCounts}
            clearQuery={this.clearQuery}
            save={this.saveConfig}
            showNoResultsMessage={!footerQueryMatched}
            enableSaving={this.props.enableSaving}
            docLinks={this.props.docLinks}
            toasts={this.props.toasts}
            trackUiMetric={this.props.trackUiMetric}
            queryText={query.text}
            theme={this.props.theme}
          />
        </KibanaContextProvider>
        <PageFooter
          toasts={this.props.toasts}
          query={query}
          onQueryMatchChange={this.onFooterQueryMatchChange}
          enableSaving={this.props.enableSaving}
        />
      </div>
    );
  }
}
