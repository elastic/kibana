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
import { htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

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
          <div className="vis_editor__table-pivot-fields">
            <div className="vis_editor__container">
              <div className="vis_editor__vis_config-row">
                <p>
                  <FormattedMessage
                    id="metrics.table.dataTab.defineFieldDescription"
                    defaultMessage="For the table visualization you need to define a field to group by using a terms aggregation."
                  />
                </p>
              </div>
              <div className="vis_editor__vis_config-row">
                <label className="vis_editor__label" htmlFor={htmlId('field')}>
                  <FormattedMessage
                    id="metrics.table.dataTab.groupByFieldLabel"
                    defaultMessage="Group By Field"
                  />
                </label>
                <div className="vis_editor__row_item" data-test-subj="groupByField">
                  <FieldSelect
                    id={htmlId('field')}
                    fields={this.props.fields}
                    value={model.pivot_id}
                    indexPattern={model.index_pattern}
                    onChange={handleSelectChange('pivot_id')}
                  />
                </div>
                <label className="vis_editor__label" htmlFor={htmlId('pivotLabelInput')}>
                  <FormattedMessage
                    id="metrics.table.dataTab.columnLabel"
                    defaultMessage="Column Label"
                  />
                </label>
                <input
                  id={htmlId('pivotLabelInput')}
                  className="vis_editor__input-grows"
                  data-test-subj="columnLabelName"
                  type="text"
                  onChange={handleTextChange('pivot_label')}
                  value={model.pivot_label}
                />
                <label className="vis_editor__label" htmlFor={htmlId('pivotRowsInput')}>
                  <FormattedMessage
                    id="metrics.table.dataTab.rowsLabel"
                    defaultMessage="Rows"
                  />
                </label>
                <input
                  id={htmlId('pivotRowsInput')}
                  className="vis_editor__input-number"
                  type="number"
                  onChange={handleTextChange('pivot_rows')}
                  value={model.pivot_rows}
                />
              </div>
            </div>
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
        <div className="vis_editor__container">
          <div className="vis_editor__vis_config-row">
            <label className="vis_editor__label" htmlFor={htmlId('drilldownInput')}>
              <FormattedMessage
                id="metrics.table.optionsTab.itemUrlLabel"
                defaultMessage="Item Url (This supports mustache templating. {key} is set to the term)"
                values={{ key: (<code>{'{{key}}'}</code>) }}
              />
            </label>
            <input
              id={htmlId('drilldownInput')}
              className="vis_editor__input-grows"
              onChange={handleTextChange('drilldown_url')}
              value={model.drilldown_url}
            />
          </div>
          <IndexPattern
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange}
          />
          <div className="vis_editor__vis_config-row">
            <label className="vis_editor__label" htmlFor={htmlId('panelFilterInput')}>
              <FormattedMessage
                id="metrics.table.optionsTab.panelFilterLabel"
                defaultMessage="Panel Filter"
              />
            </label>
            <input
              id={htmlId('panelFilterInput')}
              className="vis_editor__input-grows"
              type="text"
              onChange={handleTextChange('filter')}
              value={model.filter}
            />
            <label className="vis_editor__label" htmlFor={htmlId('globalFilterOption')}>
              <FormattedMessage
                id="metrics.table.optionsTab.ignoreGlobalFilterLabel"
                defaultMessage="Ignore Global Filter"
              />
            </label>
            <YesNo
              id={htmlId('globalFilterOption')}
              value={model.ignore_global_filter}
              name="ignore_global_filter"
              onChange={this.props.onChange}
            />
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="kbnTabs">
          <div
            className={`kbnTabs__tab${selectedTab === 'data' && '-active' || ''}`}
            onClick={() => this.switchTab('data')}
          >
            <FormattedMessage
              id="metrics.table.dataTab.columnsButtonLabel"
              defaultMessage="Columns"
            />
          </div>
          <div
            className={`kbnTabs__tab${selectedTab === 'options' && '-active' || ''}`}
            onClick={() => this.switchTab('options')}
          >
            <FormattedMessage
              id="metrics.table.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel Options"
            />
          </div>
        </div>
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
