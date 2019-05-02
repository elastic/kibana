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
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

const MovingAverageAggUi = props => {
  const { siblings, intl } = props;
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
    {
      label: intl.formatMessage({ id: 'tsvb.movingAverage.modelOptions.simpleLabel', defaultMessage: 'Simple' }),
      value: 'simple'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.movingAverage.modelOptions.linearLabel', defaultMessage: 'Linear' }),
      value: 'linear'
    },
    {
      label: intl.formatMessage({
        id: 'tsvb.movingAverage.modelOptions.exponentiallyWeightedLabel', defaultMessage: 'Exponentially Weighted' }),
      value: 'ewma'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.movingAverage.modelOptions.holtLinearLabel', defaultMessage: 'Holt-Linear' }),
      value: 'holt'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.movingAverage.modelOptions.holtWintersLabel', defaultMessage: 'Holt-Winters' }),
      value: 'holt_winters'
    }
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
      dragHandleProps={props.dragHandleProps}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="tsvb.movingAverage.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
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
            label={(<FormattedMessage
              id="tsvb.movingAverage.metricLabel"
              defaultMessage="Metric"
            />)}
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
            label={(<FormattedMessage
              id="tsvb.movingAverage.modelLabel"
              defaultMessage="Model"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              placeholder={intl.formatMessage({ id: 'tsvb.movingAverage.model.selectPlaceholder', defaultMessage: 'Select' })}
              options={modelOptions}
              selectedOptions={selectedModelOption ? [selectedModelOption] : []}
              onChange={handleSelectChange('model')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('windowSize')}
            label={(<FormattedMessage
              id="tsvb.movingAverage.windowSizeLabel"
              defaultMessage="Window Size"
            />)}
          >
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
          <EuiFormRow
            id={htmlId('minimize')}
            label={(<FormattedMessage
              id="tsvb.movingAverage.minimizeLabel"
              defaultMessage="Minimize"
            />)}
          >
            <EuiComboBox
              placeholder={intl.formatMessage({ id: 'tsvb.movingAverage.minimize.selectPlaceholder', defaultMessage: 'Select' })}
              options={minimizeOptions}
              selectedOptions={selectedMinimizeOption ? [selectedMinimizeOption] : []}
              onChange={handleSelectChange('minimize')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('predict')}
            label={(<FormattedMessage
              id="tsvb.movingAverage.predictLabel"
              defaultMessage="Predict"
            />)}
          >
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
          label={(<FormattedMessage
            id="tsvb.movingAverage.settingsLabel"
            defaultMessage="Settings"
          />)}
          helpText={
            <span>
              <FormattedMessage
                id="tsvb.movingAverage.settingsDescription"
                defaultMessage="{keyValue} space-delimited"
                values={{ keyValue: (<EuiCode>Key=Value</EuiCode>) }}
              />
            </span>
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

MovingAverageAggUi.propTypes = {
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

export const MovingAverageAgg = injectI18n(MovingAverageAggUi);
