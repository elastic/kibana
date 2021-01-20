/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { SeriesEditor } from '../series_editor';
import { IndexPattern } from '../index_pattern';
import { ColorRules } from '../color_rules';
import { YesNo } from '../yes_no';
import uuid from 'uuid';
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
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { QueryBarWrapper } from '../query_bar_wrapper';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { limitOfSeries } from '../../../../common/ui_restrictions';
import { PANEL_TYPES } from '../../../../common/panel_types';

export class MetricPanelConfig extends Component {
  constructor(props) {
    super(props);
    this.state = { selectedTab: 'data' };
  }

  UNSAFE_componentWillMount() {
    const { model } = this.props;
    if (
      !model.background_color_rules ||
      (model.background_color_rules && model.background_color_rules.length === 0)
    ) {
      this.props.onChange({
        background_color_rules: [{ id: uuid.v1() }],
      });
    }
  }

  switchTab(selectedTab) {
    this.setState({ selectedTab });
  }

  render() {
    const { selectedTab } = this.state;
    const defaults = { filter: { query: '', language: getDefaultQueryLanguage() } };
    const model = { ...defaults, ...this.props.model };
    const htmlId = htmlIdGenerator();
    let view;
    if (selectedTab === 'data') {
      view = (
        <SeriesEditor
          colorPicker={false}
          fields={this.props.fields}
          limit={limitOfSeries[PANEL_TYPES.METRIC]}
          model={this.props.model}
          name={this.props.name}
          onChange={this.props.onChange}
        />
      );
    } else {
      view = (
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.metric.optionsTab.dataLabel"
                  defaultMessage="Data"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

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
                      id="visTypeTimeseries.metric.optionsTab.panelFilterLabel"
                      defaultMessage="Panel filter"
                    />
                  }
                  fullWidth
                >
                  <QueryBarWrapper
                    query={{
                      language: model.filter.language || getDefaultQueryLanguage(),
                      query: model.filter.query || '',
                    }}
                    onChange={(filter) => this.props.onChange({ filter })}
                    indexPatterns={[model.index_pattern || model.default_index_pattern]}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.metric.optionsTab.ignoreGlobalFilterLabel"
                    defaultMessage="Ignore global filter?"
                  />
                </EuiFormLabel>
                <EuiSpacer size="m" />
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
                <FormattedMessage
                  id="visTypeTimeseries.metric.optionsTab.colorRulesLabel"
                  defaultMessage="Color rules"
                />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />

            <ColorRules
              model={model}
              onChange={this.props.onChange}
              name="background_color_rules"
            />
          </EuiPanel>
        </div>
      );
    }
    return (
      <>
        <EuiTabs size="s">
          <EuiTab isSelected={selectedTab === 'data'} onClick={() => this.switchTab('data')}>
            <FormattedMessage
              id="visTypeTimeseries.metric.dataTab.dataButtonLabel"
              defaultMessage="Data"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'options'}
            onClick={() => this.switchTab('options')}
            data-test-subj="metricEditorPanelOptionsBtn"
          >
            <FormattedMessage
              id="visTypeTimeseries.metric.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </>
    );
  }
}

MetricPanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
};
