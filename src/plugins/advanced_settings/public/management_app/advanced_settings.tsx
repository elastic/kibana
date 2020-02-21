/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import { Subscription } from 'rxjs';
import {
  Comparators,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  // @ts-ignore
  Query,
} from '@elastic/eui';

import { useParams } from 'react-router-dom';
import { CallOuts } from './components/call_outs';
import { Search } from './components/search';
import { Form } from './components/form';
import { AdvancedSettingsVoiceAnnouncement } from './components/advanced_settings_voice_announcement';
import { IUiSettingsClient, DocLinksStart, ToastsStart } from '../../../../core/public/';
import { ComponentRegistry } from '../';

import { getAriaName, toEditableConfig, DEFAULT_CATEGORY } from './lib';

import { FieldSetting, IQuery } from './types';

interface AdvancedSettingsProps {
  enableSaving: boolean;
  uiSettings: IUiSettingsClient;
  dockLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  componentRegistry: ComponentRegistry['start'];
}

interface AdvancedSettingsComponentProps extends AdvancedSettingsProps {
  queryText: string;
}

interface AdvancedSettingsState {
  footerQueryMatched: boolean;
  query: IQuery;
  filteredSettings: Record<string, FieldSetting[]>;
}

type GroupedSettings = Record<string, FieldSetting[]>;

export class AdvancedSettingsComponent extends Component<
  AdvancedSettingsComponentProps,
  AdvancedSettingsState
> {
  private settings: FieldSetting[];
  private groupedSettings: GroupedSettings;
  private categoryCounts: Record<string, number>;
  private categories: string[] = [];
  private uiSettingsSubscription?: Subscription;

  constructor(props: AdvancedSettingsComponentProps) {
    super(props);

    this.settings = this.initSettings(this.props.uiSettings);
    this.groupedSettings = this.initGroupedSettings(this.settings);
    this.categories = this.initCategories(this.groupedSettings);
    this.categoryCounts = this.initCategoryCounts(this.groupedSettings);

    const parsedQuery = Query.parse(this.props.queryText ? getAriaName(this.props.queryText) : '');
    this.state = {
      query: parsedQuery,
      footerQueryMatched: false,
      filteredSettings: this.mapSettings(Query.execute(parsedQuery, this.settings)),
    };
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
  }

  componentWillUnmount() {
    if (this.uiSettingsSubscription) {
      this.uiSettingsSubscription.unsubscribe();
    }
  }

  mapConfig(config: IUiSettingsClient) {
    const all = config.getAll();
    return Object.entries(all)
      .map(setting => {
        return toEditableConfig({
          def: setting[1],
          name: setting[0],
          value: setting[1].userValue,
          isCustom: config.isCustom(setting[0]),
          isOverridden: config.isOverridden(setting[0]),
        });
      })
      .filter(c => !c.readonly)
      .sort(Comparators.property('name', Comparators.default('asc')));
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

  onQueryChange = ({ query }: { query: IQuery }) => {
    this.setState({
      query,
      filteredSettings: this.mapSettings(Query.execute(query, this.settings)),
    });
  };

  clearQuery = () => {
    this.setState({
      query: Query.parse(''),
      footerQueryMatched: false,
      filteredSettings: this.groupedSettings,
    });
  };

  onFooterQueryMatchChange = (matched: boolean) => {
    this.setState({
      footerQueryMatched: matched,
    });
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

        <Form
          settings={filteredSettings}
          categories={this.categories}
          categoryCounts={this.categoryCounts}
          clearQuery={this.clearQuery}
          save={this.props.uiSettings.set.bind(this.props.uiSettings)}
          clear={this.props.uiSettings.remove.bind(this.props.uiSettings)}
          showNoResultsMessage={!footerQueryMatched}
          enableSaving={this.props.enableSaving}
          dockLinks={this.props.dockLinks}
          toasts={this.props.toasts}
        />
        <PageFooter
          query={query}
          onQueryMatchChange={this.onFooterQueryMatchChange}
          enableSaving={this.props.enableSaving}
        />
      </div>
    );
  }
}

export const AdvancedSettings = (props: AdvancedSettingsProps) => {
  const { query } = useParams();
  return (
    <AdvancedSettingsComponent
      queryText={query || ''}
      enableSaving={props.enableSaving}
      uiSettings={props.uiSettings}
      dockLinks={props.dockLinks}
      toasts={props.toasts}
      componentRegistry={props.componentRegistry}
    />
  );
};
