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
  EuiComboBox,
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
      label: intl.formatMessage({ id: 'metrics.movingAverage.modelOptions.simpleLabel', defaultMessage: 'Simple' }),
      value: 'simple'
    },
    {
      label: intl.formatMessage({ id: 'metrics.movingAverage.modelOptions.linearLabel', defaultMessage: 'Linear' }),
      value: 'linear'
    },
    {
      label: intl.formatMessage({
        id: 'metrics.movingAverage.modelOptions.exponentiallyWeightedLabel', defaultMessage: 'Exponentially Weighted' }),
      value: 'ewma'
    },
    {
      label: intl.formatMessage({ id: 'metrics.movingAverage.modelOptions.holtLinearLabel', defaultMessage: 'Holt-Linear' }),
      value: 'holt'
    },
    {
      label: intl.formatMessage({ id: 'metrics.movingAverage.modelOptions.holtWintersLabel', defaultMessage: 'Holt-Winters' }),
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
    >
      <div className="vis_editor__row_item">
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <div className="vis_editor__label">
              <FormattedMessage
                id="metrics.movingAverage.aggregationLabel"
                defaultMessage="Aggregation"
              />
            </div>
            <AggSelect
              panelType={props.panel.type}
              siblings={props.siblings}
              value={model.type}
              onChange={handleSelectChange('type')}
            />
          </div>
          <div className="vis_editor__row_item">
            <div className="vis_editor__label">
              <FormattedMessage
                id="metrics.movingAverage.metricLabel"
                defaultMessage="Metric"
              />
            </div>
            <MetricSelect
              onChange={handleSelectChange('field')}
              metrics={siblings}
              metric={model}
              value={model.field}
            />
          </div>
        </div>
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('model')}>
              <FormattedMessage
                id="metrics.movingAverage.modelLabel"
                defaultMessage="Model"
              />
            </label>
            <EuiComboBox
              isClearable={false}
              id={htmlId('model')}
              placeholder={intl.formatMessage({ id: 'metrics.movingAverage.model.selectPlaceholder', defaultMessage: 'Select…' })}
              options={modelOptions}
              selectedOptions={selectedModelOption ? [selectedModelOption] : []}
              onChange={handleSelectChange('model')}
              singleSelection={true}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('windowSize')}>
              <FormattedMessage
                id="metrics.movingAverage.windowSizeLabel"
                defaultMessage="Window Size"
              />
            </label>
            <input
              id={htmlId('windowSize')}
              className="vis_editor__input-grows-100"
              type="text"
              onChange={handleNumberChange('window')}
              value={model.window}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('minimize')}>
              <FormattedMessage
                id="metrics.movingAverage.minimizeLabel"
                defaultMessage="Minimize"
              />
            </label>
            <EuiComboBox
              id={htmlId('minimize')}
              placeholder={intl.formatMessage({ id: 'metrics.movingAverage.minimize.selectPlaceholder', defaultMessage: 'Select…' })}
              options={minimizeOptions}
              selectedOptions={selectedMinimizeOption ? [selectedMinimizeOption] : []}
              onChange={handleSelectChange('minimize')}
              singleSelection={true}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('windowSize')}>
              <FormattedMessage
                id="metrics.movingAverage.predictLabel"
                defaultMessage="Predict"
              />
            </label>
            <input
              id={htmlId('predict')}
              className="vis_editor__input-grows-100"
              type="text"
              onChange={handleNumberChange('predict')}
              value={model.predict}
            />
          </div>
        </div>
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('settings')}>
              <FormattedMessage
                id="metrics.movingAverage.settingsLabel"
                defaultMessage="Settings ({keyValue} space-delimited)"
                values={{ keyValue: (<code>Key=Value</code>) }}
              />
            </label>
            <input
              id={htmlId('settings')}
              className="vis_editor__input-grows-100"
              type="text"
              onChange={handleTextChange('settings')}
              value={model.settings}
            />
          </div>
        </div>
      </div>
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
