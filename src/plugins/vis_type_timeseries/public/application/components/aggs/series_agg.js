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
import { AggSelect } from './agg_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiComboBox,
  EuiTitle,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

function SeriesAggUi(props) {
  const { panel, model, intl } = props;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);

  const htmlId = htmlIdGenerator();

  const functionOptions = [
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.sumLabel',
        defaultMessage: 'Sum',
      }),
      value: 'sum',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.maxLabel',
        defaultMessage: 'Max',
      }),
      value: 'max',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.minLabel',
        defaultMessage: 'Min',
      }),
      value: 'min',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.avgLabel',
        defaultMessage: 'Avg',
      }),
      value: 'mean',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.overallSumLabel',
        defaultMessage: 'Overall Sum',
      }),
      value: 'overall_sum',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.overallMaxLabel',
        defaultMessage: 'Overall Max',
      }),
      value: 'overall_max',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.overallMinLabel',
        defaultMessage: 'Overall Min',
      }),
      value: 'overall_min',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.overallAvgLabel',
        defaultMessage: 'Overall Avg',
      }),
      value: 'overall_avg',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.seriesAgg.functionOptions.cumulativeSumLabel',
        defaultMessage: 'Cumulative Sum',
      }),
      value: 'cumulative_sum',
    },
  ];
  const selectedFunctionOption = functionOptions.find((option) => {
    return model.function === option.value;
  });

  if (panel.type === 'table') {
    return (
      <AggRow
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onDelete={props.onDelete}
        siblings={props.siblings}
        dragHandleProps={props.dragHandleProps}
      >
        <EuiTitle className="tvbAggRow__unavailable" size="xxxs">
          <span>
            <FormattedMessage
              id="visTypeTimeseries.seriesAgg.seriesAggIsNotCompatibleLabel"
              defaultMessage="Series Agg is not compatible with the table visualization."
            />
          </span>
        </EuiTitle>
      </AggRow>
    );
  }

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
              id="visTypeTimeseries.seriesAgg.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <AggSelect
            id={htmlId('aggregation')}
            panelType={panel.type}
            siblings={props.siblings}
            value={model.type}
            onChange={handleSelectChange('type')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('function')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.seriesAgg.functionLabel"
                defaultMessage="Function"
              />
            }
          >
            <EuiComboBox
              options={functionOptions}
              selectedOptions={selectedFunctionOption ? [selectedFunctionOption] : []}
              onChange={handleSelectChange('function')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
}

SeriesAggUi.propTypes = {
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

export const SeriesAgg = injectI18n(SeriesAggUi);
