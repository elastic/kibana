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
import PropTypes from 'prop-types';

import {
  Comparators,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  Query,
} from '@elastic/eui';

import { CallOuts } from './components/call_outs';
import { Search } from './components/search';
import { Form } from './components/form';

import { getAriaName, toEditableConfig, DEFAULT_CATEGORY } from './lib';

import './advanced_settings.less';

export class AdvancedSettings extends Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
    query: PropTypes.string,
  }

  constructor(props) {
    super(props);
    const { config, query } = this.props;
    const parsedQuery = Query.parse(query ? `ariaName:"${getAriaName(query)}"` : '');
    this.init(config);
    this.state = {
      query: parsedQuery,
      filteredSettings: this.mapSettings(Query.execute(parsedQuery, this.settings)),
    };
  }

  init(config) {
    this.settings = this.mapConfig(config);
    this.groupedSettings = this.mapSettings(this.settings);

    this.categories = Object.keys(this.groupedSettings).sort((a, b) => {
      if(a === DEFAULT_CATEGORY) return -1;
      if(b === DEFAULT_CATEGORY) return 1;
      if(a > b) return 1;
      return a === b ? 0 : -1;
    });

    this.categoryCounts = Object.keys(this.groupedSettings).reduce((counts, category) => {
      counts[category] = this.groupedSettings[category].length;
      return counts;
    }, {});
  }

  componentWillReceiveProps(nextProps) {
    const { config } = nextProps;
    const { query } = this.state;

    this.init(config);
    this.setState({
      filteredSettings: this.mapSettings(Query.execute(query, this.settings)),
    });
  }

  mapConfig(config) {
    const all = config.getAll();
    return Object.entries(all)
      .map((setting) => {
        return toEditableConfig({
          def: setting[1],
          name: setting[0],
          value: setting[1].userValue,
          isCustom: config.isCustom(setting[0]),
        });
      })
      .filter((c) => !c.readonly)
      .sort(Comparators.property('name', Comparators.default('asc')));
  }

  mapSettings(settings) {
    // Group settings by category
    return settings.reduce((groupedSettings, setting) => {
      // We will want to change this logic when we put each category on its
      // own page aka allowing a setting to be included in multiple categories.
      const category = setting.category[0];
      (groupedSettings[category] = groupedSettings[category] || []).push(setting);
      return groupedSettings;
    }, {});
  }

  saveConfig = (name, value) => {
    return this.props.config.set(name, value);
  }

  clearConfig = (name) => {
    return this.props.config.remove(name);
  }

  onQueryChange = ({ query }) => {
    this.setState({
      query,
      filteredSettings: this.mapSettings(Query.execute(query, this.settings)),
    });
  }

  clearQuery = () => {
    this.setState({
      query: Query.parse(''),
      filteredSettings: this.groupedSettings,
    });
  }

  render() {
    const { filteredSettings, query } = this.state;

    return (
      <div className="advancedSettings">
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <EuiText>
              <h1>Settings</h1>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <Search
              query={query}
              categories={this.categories}
              onQueryChange={this.onQueryChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <CallOuts/>
        <EuiSpacer size="m" />
        <Form
          settings={filteredSettings}
          categories={this.categories}
          categoryCounts={this.categoryCounts}
          clearQuery={this.clearQuery}
          save={this.saveConfig}
          clear={this.clearConfig}
        />
      </div>
    );
  }
}
