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
import { FieldSelect } from './field_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFieldText,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { KBN_FIELD_TYPES } from '../../../../../../plugins/data/public';
import { METRIC_TYPES } from '../../../common/metric_types';

export const FilterRatioAgg = props => {
  const { series, fields, panel } = props;

  const handleChange = createChangeHandler(props.onChange, props.model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);
  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) || panel.index_pattern;

  const defaults = {
    numerator: '*',
    denominator: '*',
    metric_agg: 'count',
  };

  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();

  const restrictFields =
    model.metric_agg === METRIC_TYPES.CARDINALITY ? [] : [KBN_FIELD_TYPES.NUMBER];

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
              id="visTypeTimeseries.filterRatio.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
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
            id={htmlId('numerator')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.filterRatio.numeratorLabel"
                defaultMessage="Numerator"
              />
            }
          >
            <EuiFieldText onChange={handleTextChange('numerator')} value={model.numerator} />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('denominator')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.filterRatio.denominatorLabel"
                defaultMessage="Denominator"
              />
            }
          >
            <EuiFieldText onChange={handleTextChange('denominator')} value={model.denominator} />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('metric')}>
            <FormattedMessage
              id="visTypeTimeseries.filterRatio.metricAggregationLabel"
              defaultMessage="Metric Aggregation"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <AggSelect
            id={htmlId('metric')}
            siblings={props.siblings}
            panelType="metrics"
            value={model.metric_agg}
            onChange={handleSelectChange('metric_agg')}
          />
        </EuiFlexItem>

        {model.metric_agg !== 'count' ? (
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('aggField')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.filterRatio.fieldLabel"
                  defaultMessage="Field"
                />
              }
            >
              <FieldSelect
                fields={fields}
                type={model.metric_agg}
                restrict={restrictFields}
                indexPattern={indexPattern}
                value={model.field}
                onChange={handleSelectChange('field')}
              />
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </AggRow>
  );
};

FilterRatioAgg.propTypes = {
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
