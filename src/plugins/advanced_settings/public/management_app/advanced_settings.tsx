/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';

import { UiCounterMetricType } from '@kbn/analytics';

import { DocLinksStart, ToastsStart, ThemeServiceStart } from '@kbn/core/public';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import { AdvancedSettingsVoiceAnnouncement } from './components/advanced_settings_voice_announcement';
import { Form } from './components/form';

import { FieldSetting, SettingsChanges } from './types';

export const QUERY = 'query';

interface AdvancedSettingsProps {
  enableSaving: boolean;
  settingsService: SettingsStart;
  /** TODO: remove once use_ui_setting is changed to use the settings service
   * https://github.com/elastic/kibana/issues/149347 */
  uiSettingsClient: IUiSettingsClient;
  docLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  theme: ThemeServiceStart['theme$'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  groupedSettings: GroupedSettings;
  categoryCounts: Record<string, number>;
  categories: string[];
  visibleSettings: Record<string, FieldSetting[]>;
  noResults: boolean;
  clearQuery: () => void;
  queryText: string;
  callOutTitle: string;
  callOutSubtitle: string;
}

type GroupedSettings = Record<string, FieldSetting[]>;

export class AdvancedSettings extends Component<AdvancedSettingsProps> {
  constructor(props: AdvancedSettingsProps) {
    super(props);
  }

  saveConfig = async (changes: SettingsChanges) => {
    const arr = Object.entries(changes).map(([key, value]) =>
      this.props.uiSettingsClient.set(key, value)
    );
    return Promise.all(arr);
  };

  render() {
    return (
      <div>
        <EuiSpacer size="xl" />
        <EuiCallOut title={this.props.callOutTitle} iconType="alert">
          <p>{this.props.callOutSubtitle}</p>
        </EuiCallOut>
        <EuiSpacer size="xl" />

        <AdvancedSettingsVoiceAnnouncement
          queryText={this.props.queryText}
          settings={this.props.visibleSettings}
        />
        <KibanaContextProvider
          services={{
            uiSettings: this.props.settingsService.client,
            settings: this.props.settingsService,
          }}
        >
          <Form
            settings={this.props.groupedSettings}
            visibleSettings={this.props.visibleSettings}
            categories={this.props.categories}
            categoryCounts={this.props.categoryCounts}
            clearQuery={this.props.clearQuery}
            save={this.saveConfig}
            showNoResultsMessage={this.props.noResults}
            enableSaving={this.props.enableSaving}
            docLinks={this.props.docLinks}
            toasts={this.props.toasts}
            trackUiMetric={this.props.trackUiMetric}
            queryText={this.props.queryText}
            theme={this.props.theme}
          />
        </KibanaContextProvider>
      </div>
    );
  }
}
