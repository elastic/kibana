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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { SeriesEditor } from '../series_editor';
import { IndexPattern } from '../index_pattern';
import { createTextHandler } from '../lib/create_text_handler';
import { ColorRules } from '../color_rules';
import { ColorPicker } from '../color_picker';
import uuid from 'uuid';
import { YesNo } from '../yes_no';
import {
  htmlIdGenerator,
  EuiTabs,
  EuiTab,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFormLabel,
  EuiSpacer,
  EuiFieldText,
  EuiTitle,
  EuiHorizontalRule,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Storage } from 'ui/storage';
import { data } from 'plugins/data/setup';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
const { QueryBarInput } = data.query.ui;
const localStorage = new Storage(window.localStorage);

export class TopNPanelConfig extends Component {
  constructor(props) {
    super(props);
    this.state = { selectedTab: 'data' };
  }

  componentWillMount() {
    const { model } = this.props;
    const parts = {};
    if (!model.bar_color_rules || (model.bar_color_rules && model.bar_color_rules.length === 0)) {
      parts.bar_color_rules = [{ id: uuid.v1() }];
    }
    this.props.onChange(parts);
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  render() {
    const { selectedTab } = this.state;
    const defaults = {
      drilldown_url: '',
      filter: { query: '', language: getDefaultQueryLanguage() },
    };
    const model = { ...defaults, ...this.props.model };
    const htmlId = htmlIdGenerator();
    const handleTextChange = createTextHandler(this.props.onChange);
    let view;
    if (selectedTab === 'data') {
      view = (
        <SeriesEditor
          colorPicker={false}
          fields={this.props.fields}
          model={this.props.model}
          name={this.props.name}
          visData$={this.props.visData$}
          onChange={this.props.onChange}
        />
      );
    } else {
      view = (
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage id="tsvb.topN.optionsTab.dataLabel" defaultMessage="Data" />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              id={htmlId('itemUrl')}
              label={
                <FormattedMessage
                  id="tsvb.topN.optionsTab.itemUrlLabel"
                  defaultMessage="Item url"
                />
              }
              helpText={
                <span>
                  <FormattedMessage
                    id="tsvb.topN.optionsTab.itemUrlDescription"
                    defaultMessage="This supports mustache templating. {key} is set to the term."
                    values={{ key: <EuiCode>{'{{key}}'}</EuiCode> }}
                  />
                </span>
              }
            >
              <EuiFieldText
                onChange={handleTextChange('drilldown_url')}
                value={model.drilldown_url}
              />
            </EuiFormRow>

            <EuiHorizontalRule />

            <IndexPattern
              fields={this.props.fields}
              model={this.props.model}
              onChange={this.props.onChange}
            />

            <EuiHorizontalRule />

            <EuiFlexGroup responsive={false} wrap={true}>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('panelFilter')}
                  label={
                    <FormattedMessage
                      id="tsvb.topN.optionsTab.panelFilterLabel"
                      defaultMessage="Panel filter"
                    />
                  }
                  fullWidth
                >
                  <QueryBarInput
                    query={{
                      language: model.filter.language
                        ? model.filter.language
                        : getDefaultQueryLanguage(),
                      query: model.filter.query || '',
                    }}
                    onChange={filter => this.props.onChange({ filter })}
                    appName={'VisEditor'}
                    indexPatterns={[model.index_pattern || model.default_index_pattern]}
                    store={localStorage}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="tsvb.topN.optionsTab.ignoreGlobalFilterLabel"
                    defaultMessage="Ignore global filter?"
                  />
                </EuiFormLabel>
                <EuiSpacer size="s" />
                <YesNo
                  value={model.ignore_global_filter}
                  name="ignore_global_filter"
                  onChange={this.props.onChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer />

          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage id="tsvb.topN.optionsTab.styleLabel" defaultMessage="Style" />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFormLabel style={{ marginBottom: 0 }}>
                  <FormattedMessage
                    id="tsvb.topN.optionsTab.backgroundColorLabel"
                    defaultMessage="Background color:"
                  />
                </EuiFormLabel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ColorPicker
                  onChange={this.props.onChange}
                  name="background_color"
                  value={model.background_color}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule />

            <EuiTitle size="xxs">
              <span>
                <FormattedMessage
                  id="tsvb.topN.optionsTab.colorRulesLabel"
                  defaultMessage="Color rules"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="s" />
            <ColorRules
              model={model}
              primaryVarName="bar_color"
              primaryName="bar"
              hideSecondary={true}
              onChange={this.props.onChange}
              name="bar_color_rules"
            />
          </EuiPanel>
        </div>
      );
    }
    return (
      <div>
        <EuiTabs size="s">
          <EuiTab isSelected={selectedTab === 'data'} onClick={() => this.switchTab('data')}>
            <FormattedMessage id="tsvb.topN.dataTab.dataButtonLabel" defaultMessage="Data" />
          </EuiTab>
          <EuiTab isSelected={selectedTab === 'options'} onClick={() => this.switchTab('options')}>
            <FormattedMessage
              id="tsvb.topN.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </div>
    );
  }
}

TopNPanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData$: PropTypes.object,
};
