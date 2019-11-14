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
import { FieldSelect } from '../aggs/field_select';
import { SeriesEditor } from '../series_editor';
import { IndexPattern } from '../index_pattern';
import { createTextHandler } from '../lib/create_text_handler';
import { get } from 'lodash';
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
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { QueryBarWrapper } from '../query_bar_wrapper';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
export class TablePanelConfig extends Component {
  constructor(props) {
    super(props);
    this.state = { selectedTab: 'data' };
  }

  UNSAFE_componentWillMount() {
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

  handlePivotChange = selectedOption => {
    const { fields, model } = this.props;
    const pivotId = get(selectedOption, '[0].value', null);
    const field = fields[model.index_pattern].find(field => field.name === pivotId);
    const pivotType = get(field, 'type', model.pivot_type);

    this.props.onChange({
      pivot_id: pivotId,
      pivot_type: pivotType,
    });
  };

  render() {
    const { selectedTab } = this.state;
    const defaults = {
      drilldown_url: '',
      filter: { query: '', language: getDefaultQueryLanguage() },
      pivot_label: '',
      pivot_rows: 10,
      pivot_type: '',
    };
    const model = { ...defaults, ...this.props.model };
    const handleTextChange = createTextHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();
    let view;
    if (selectedTab === 'data') {
      view = (
        <div>
          <div className="tvbPanelConfig__container">
            <EuiPanel>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="visTypeTimeseries.table.dataTab.defineFieldDescription"
                    defaultMessage="For the table visualization you need to define a field to group by using a terms aggregation."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />

              <EuiFlexGroup responsive={false} wrap={true}>
                <EuiFlexItem data-test-subj="groupByField">
                  <EuiFormRow
                    id={htmlId('field')}
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.table.dataTab.groupByFieldLabel"
                        defaultMessage="Group by field"
                      />
                    }
                  >
                    <FieldSelect
                      fields={this.props.fields}
                      value={model.pivot_id}
                      indexPattern={model.index_pattern}
                      onChange={this.handlePivotChange}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    id={htmlId('pivotLabelInput')}
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.table.dataTab.columnLabel"
                        defaultMessage="Column label"
                      />
                    }
                    fullWidth
                  >
                    <EuiFieldText
                      data-test-subj="columnLabelName"
                      onChange={handleTextChange('pivot_label')}
                      value={model.pivot_label}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    id={htmlId('pivotRowsInput')}
                    label={
                      <FormattedMessage id="visTypeTimeseries.table.dataTab.rowsLabel" defaultMessage="Rows" />
                    }
                  >
                    {/*
                      EUITODO: The following input couldn't be converted to EUI because of type mis-match.
                      Should it be number or string?
                    */}
                    <input
                      className="tvbAgg__input"
                      type="number"
                      onChange={handleTextChange('pivot_rows')}
                      value={model.pivot_rows}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </div>

          <SeriesEditor
            fields={this.props.fields}
            model={this.props.model}
            name={this.props.name}
            onChange={this.props.onChange}
          />
        </div>
      );
    } else {
      view = (
        <div className="tvbPanelConfig__container">
          <EuiPanel>
            <EuiTitle size="s">
              <span>
                <FormattedMessage id="visTypeTimeseries.table.optionsTab.dataLabel" defaultMessage="Data" />
              </span>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              id={htmlId('drilldownInput')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.table.optionsTab.itemUrlLabel"
                  defaultMessage="Item url"
                />
              }
              helpText={
                <span>
                  <FormattedMessage
                    id="visTypeTimeseries.table.optionsTab.itemUrlHelpText"
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
                  id={htmlId('panelFilterInput')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.table.optionsTab.panelFilterLabel"
                      defaultMessage="Panel filter"
                    />
                  }
                  fullWidth
                >
                  <QueryBarWrapper
                    query={{
                      language: model.filter.language
                        ? model.filter.language
                        : getDefaultQueryLanguage(),
                      query: model.filter.query || '',
                    }}
                    onChange={filter => this.props.onChange({ filter })}
                    indexPatterns={[model.index_pattern || model.default_index_pattern]}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel htmlFor={htmlId('globalFilterOption')}>
                  <FormattedMessage
                    id="visTypeTimeseries.table.optionsTab.ignoreGlobalFilterLabel"
                    defaultMessage="Ignore global filter?"
                  />
                </EuiFormLabel>
                <EuiSpacer size="m" />
                <YesNo
                  id={htmlId('globalFilterOption')}
                  value={model.ignore_global_filter}
                  name="ignore_global_filter"
                  onChange={this.props.onChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </div>
      );
    }
    return (
      <div>
        <EuiTabs size="s">
          <EuiTab isSelected={selectedTab === 'data'} onClick={() => this.switchTab('data')}>
            <FormattedMessage id="visTypeTimeseries.table.dataTab.columnsButtonLabel" defaultMessage="Columns" />
          </EuiTab>
          <EuiTab isSelected={selectedTab === 'options'} onClick={() => this.switchTab('options')}>
            <FormattedMessage
              id="visTypeTimeseries.table.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
        {view}
      </div>
    );
  }
}

TablePanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
};
