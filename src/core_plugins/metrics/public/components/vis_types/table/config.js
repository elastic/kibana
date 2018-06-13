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
import uuid from 'uuid';
import DataFormatPicker from '../../data_format_picker';
import createSelectHandler from '../../lib/create_select_handler';
import createTextHandler from '../../lib/create_text_handler';
import FieldSelect from '../../aggs/field_select';
import YesNo from '../../yes_no';
import ColorRules from '../../color_rules';
import {
  htmlIdGenerator,
  EuiComboBox,
} from '@elastic/eui';

class TableSeriesConfig extends Component {

  componentWillMount() {
    const { model } = this.props;
    if (!model.color_rules || (model.color_rules && model.color_rules.length === 0)) {
      this.props.onChange({
        color_rules: [{ id: uuid.v1() }]
      });
    }
  }

  render() {
    const defaults = { offset_time: '', value_template: '' };
    const model = { ...defaults, ...this.props.model };
    const handleSelectChange = createSelectHandler(this.props.onChange);
    const handleTextChange = createTextHandler(this.props.onChange);
    const htmlId = htmlIdGenerator();

    const functionOptions = [
      { label: 'Sum', value: 'sum' },
      { label: 'Max', value: 'max' },
      { label: 'Min', value: 'min' },
      { label: 'Avg', value: 'mean' },
      { label: 'Overall Sum', value: 'overall_sum' },
      { label: 'Overall Max', value: 'overall_max' },
      { label: 'Overall Min', value: 'overall_min' },
      { label: 'Overall Avg', value: 'overall_avg' },
      { label: 'Cumlative Sum', value: 'cumlative_sum' },
    ];
    const selectedAggFuncOption = functionOptions.find(option => {
      return model.aggregate_function === option.value;
    });

    return (
      <div>
        <div className="vis_editor__series_config-container">
          <div className="vis_editor__series_config-row">
            <DataFormatPicker
              onChange={handleSelectChange('formatter')}
              value={model.formatter}
            />
            <label className="vis_editor__label" htmlFor={htmlId('valueTemplateInput')}>Template (eg.<code>{'{{value}}/s'}</code>)</label>
            <input
              id={htmlId('valueTemplateInput')}
              className="vis_editor__input-grows"
              onChange={handleTextChange('value_template')}
              value={model.value_template}
            />
          </div>
          <div className="vis_editor__series_config-row">
            <label className="vis_editor__label" htmlFor={htmlId('filterInput')}>Filter</label>
            <input
              id={htmlId('filterInput')}
              className="vis_editor__input-grows"
              onChange={handleTextChange('filter')}
              value={model.filter}
            />
            <label className="vis_editor__label">Show Trend Arrows</label>
            <YesNo
              value={model.trend_arrows}
              name="trend_arrows"
              onChange={this.props.onChange}
            />
          </div>
          <div className="vis_editor__series_config-row">
            <div className="vis_editor__row_item">
              <FieldSelect
                fields={this.props.fields}
                indexPattern={this.props.panel.index_pattern}
                value={model.aggregate_by}
                onChange={handleSelectChange('aggregate_by')}
              />
            </div>
            <label className="vis_editor__label" htmlFor={htmlId('aggregateFunctionInput')}>Aggregate Function</label>
            <div className="vis_editor__row_item">
              <EuiComboBox
                id={htmlId('aggregateFunctionInput')}
                options={functionOptions}
                selectedOptions={selectedAggFuncOption ? [selectedAggFuncOption] : []}
                onChange={handleSelectChange('aggregate_function')}
                singleSelection={true}
              />
            </div>
          </div>
          <div className="vis_editor__series_config-row summarize__colorRules">
            <ColorRules
              primaryName="text"
              primaryVarName="text"
              hideSecondary={true}
              model={model}
              onChange={this.props.onChange}
              name="color_rules"
            />
          </div>
        </div>
      </div>
    );
  }

}

TableSeriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default TableSeriesConfig;


