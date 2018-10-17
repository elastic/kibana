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
import FieldSelect from '../aggs/field_select';
import SeriesEditor from '../series_editor';
import { IndexPattern } from '../index_pattern';
import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import uuid from 'uuid';
import YesNo from '../yes_no';
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

class TablePanelConfig extends Component {

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
    const defaults = { drilldown_url: '', filter: '', pivot_label: '', pivot_rows: 10 };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
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
                  For the table visualization you need to define a field to
                  group by using a terms aggregation.
                </p>
              </EuiText>
              <EuiSpacer size="m" />

              <EuiFlexGroup responsive={false} wrap={true}>
                <EuiFlexItem>
                  <EuiFormLabel htmlFor={htmlId('field')}>Group by field</EuiFormLabel>
                  <FieldSelect
                    id={htmlId('field')}
                    fields={this.props.fields}
                    value={model.pivot_id}
                    indexPattern={model.index_pattern}
                    onChange={handleSelectChange('pivot_id')}
                    fullWidth
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    id={htmlId('pivotLabelInput')}
                    label="Column label"
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
                    label="Rows"
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
            <EuiTitle size="s"><span>Data</span></EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              id={htmlId('drilldownInput')}
              label="Item url"
              helpText={
                <span>
                  This supports mustache templating.
                  <EuiCode>{'{{key}}'}</EuiCode> is set to the term.
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
                  label="Panel filter"
                  fullWidth
                >
                  <EuiFieldText
                    onChange={handleTextChange('filter')}
                    value={model.filter}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel htmlFor={htmlId('globalFilterOption')}>Ignore global filter?</EuiFormLabel>
                <EuiSpacer size="s" />
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
        <EuiTabs>
          <EuiTab
            isSelected={selectedTab === 'data'}
            onClick={() => this.switchTab('data')}
          >
            Columns
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'options'}
            onClick={() => this.switchTab('options')}
          >
            Panel options
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
  visData: PropTypes.object,
};

export default TablePanelConfig;
