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
import React from 'react';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import createNumberHandler from '../lib/create_number_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiComboBox,
  EuiSpacer,
  EuiFormRow,
  EuiCode,
  EuiTextArea,
} from '@elastic/eui';

export const MovingAverageAgg = props => {
  const { siblings } = props;
  const defaults = {
    settings: '',
    minimize: 0,
    window: '',
    model: 'simple'
  };
  const model = { ...defaults, ...props.model };
  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);
  const handleNumberChange = createNumberHandler(handleChange);
  const modelOptions = [
    { label: 'Simple', value: 'simple' },
    { label: 'Linear', value: 'linear' },
    { label: 'Exponentially Weighted', value: 'ewma' },
    { label: 'Holt-Linear', value: 'holt' },
    { label: 'Holt-Winters', value: 'holt_winters' }
  ];
  const minimizeOptions = [
    { label: 'True', value: 1 },
    { label: 'False', value: 0 }
  ];
  const htmlId = htmlIdGenerator();
  const selectedModelOption = modelOptions.find(option => {
    return model.model === option.value;
  });
  const selectedMinimizeOption = minimizeOptions.find(option => {
    return model.minimize === option.value;
  });

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>Aggregation</EuiFormLabel>
          <AggSelect
            id={htmlId('aggregation')}
            panelType={props.panel.type}
            siblings={props.siblings}
            value={model.type}
            onChange={handleSelectChange('type')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('metric')}
            label="Metric"
          >
            <MetricSelect
              onChange={handleSelectChange('field')}
              metrics={siblings}
              metric={model}
              value={model.field}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('model')}
            label="Model"
          >
            <EuiComboBox
              isClearable={false}
              placeholder="Select"
              options={modelOptions}
              selectedOptions={selectedModelOption ? [selectedModelOption] : []}
              onChange={handleSelectChange('model')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow id={htmlId('windowSize')} label="Window size">
            {/*
              EUITODO: The following input couldn't be converted to EUI because of type mis-match.
              Should it be text or number?
            */}
            <input
              className="tvbAgg__input"
              type="text"
              onChange={handleNumberChange('window')}
              value={model.window}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow id={htmlId('minimize')} label="Minimize">
            <EuiComboBox
              placeholder="Select"
              options={minimizeOptions}
              selectedOptions={selectedMinimizeOption ? [selectedMinimizeOption] : []}
              onChange={handleSelectChange('minimize')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow id={htmlId('predict')} label="Predict">
            {/*
              EUITODO: The following input couldn't be converted to EUI because of type mis-match.
              Should it be text or number?
            */}
            <input
              className="tvbAgg__input"
              type="text"
              onChange={handleNumberChange('predict')}
              value={model.predict}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexItem>
        <EuiFormRow
          fullWidth
          id={htmlId('settings')}
          label="Settings"
          helpText={
            <span><EuiCode>Key=Value</EuiCode> space-delimited</span>
          }
        >
          <EuiTextArea
            onChange={handleTextChange('settings')}
            value={model.settings}
            fullWidth
          />
        </EuiFormRow>
      </EuiFlexItem>
    </AggRow>
  );
};

MovingAverageAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};
