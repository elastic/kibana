/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';

import { UiCounterMetricType } from '@kbn/analytics';

import {
  IUiSettingsClient,
  DocLinksStart,
  ToastsStart,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AdvancedSettingsVoiceAnnouncement } from './components/advanced_settings_voice_announcement';
import { Form } from './components/form';

import { FieldSetting, SettingsChanges } from './types';

export const QUERY = 'query';

interface AdvancedSettingsProps {
  history: ScopedHistory;
  enableSaving: boolean;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart['links'];
  toasts: ToastsStart;
  theme: ThemeServiceStart['theme$'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  settings: FieldSetting[];
  groupedSettings: GroupedSettings;
  categoryCounts: Record<string, number>;
  categories: string[];
  visibleSettings: Record<string, FieldSetting[]>;
  noResults: boolean;
  clearQuery: () => void;
  queryText: string;
}

type GroupedSettings = Record<string, FieldSetting[]>;

export class AdvancedSettings extends Component<AdvancedSettingsProps> {
  constructor(props: AdvancedSettingsProps) {
    super(props);
  }

  saveConfig = async (changes: SettingsChanges) => {
    const arr = Object.entries(changes).map(([key, value]) =>
      this.props.uiSettings.set(key, value)
    );
    return Promise.all(arr);
  };

  render() {
    return (
      <div>
        <EuiSpacer size="xl" />
        <EuiCallOut
          title={
            <FormattedMessage
              id="advancedSettings.callOutDefaultSpaceTitle"
              defaultMessage="Changes will affect the `default` space"
            />
          }
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="advancedSettings.callOutDefaultSpaceText"
              defaultMessage="Changes will only be applied to the current space. These settings are intended for advanced users, as improper configurations may adversely affect aspects of Kibana."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="xl" />

        <AdvancedSettingsVoiceAnnouncement
          queryText={this.props.queryText}
          settings={this.props.visibleSettings}
        />
        <KibanaContextProvider services={{ uiSettings: this.props.uiSettings }}>
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
