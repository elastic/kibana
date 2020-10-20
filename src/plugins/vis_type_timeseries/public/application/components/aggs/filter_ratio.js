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
import React, { useCallback, useMemo } from 'react';
import { AggSelect } from './agg_select';
import { FieldSelect } from './field_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { KBN_FIELD_TYPES } from '../../../../../../plugins/data/public';
import { getSupportedFieldsByMetricType } from '../lib/get_supported_fields_by_metric_type';
import { getDataStart } from '../../../services';
import { QueryBarWrapper } from '../query_bar_wrapper';

const isFieldHistogram = (fields, indexPattern, field) => {
  const indexFields = fields[indexPattern];
  if (!indexFields) return false;
  const fieldObject = indexFields.find((f) => f.name === field);
  if (!fieldObject) return false;
  return fieldObject.type === KBN_FIELD_TYPES.HISTOGRAM;
};

export const FilterRatioAgg = (props) => {
  const { series, fields, panel } = props;

  const handleChange = useMemo(() => createChangeHandler(props.onChange, props.model), [
    props.model,
    props.onChange,
  ]);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumeratorQueryChange = useCallback((query) => handleChange({ numerator: query }), [
    handleChange,
  ]);
  const handleDenominatorQueryChange = useCallback(
    (query) => handleChange({ denominator: query }),
    [handleChange]
  );
  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) || panel.index_pattern;

  const defaults = {
    numerator: getDataStart().query.queryString.getDefaultQuery(),
    denominator: getDataStart().query.queryString.getDefaultQuery(),
    metric_agg: 'count',
  };

  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();

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
            <QueryBarWrapper
              query={model.numerator}
              onChange={handleNumeratorQueryChange}
              indexPatterns={[indexPattern]}
            />
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
            <QueryBarWrapper
              query={model.denominator}
              onChange={handleDenominatorQueryChange}
              indexPatterns={[indexPattern]}
            />
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
            panelType={
              isFieldHistogram(fields, indexPattern, model.field) ? 'histogram' : 'filter_ratio'
            }
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
                restrict={getSupportedFieldsByMetricType(model.metric_agg)}
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
