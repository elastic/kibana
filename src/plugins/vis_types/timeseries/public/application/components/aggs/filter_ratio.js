/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { useCallback, useMemo } from 'react';
import { AggSelect } from './agg_select';
import { FieldSelect } from './field_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';
import { getSupportedFieldsByMetricType } from '../lib/get_supported_fields_by_metric_type';
import { getDataStart } from '../../../services';
import { QueryBarWrapper } from '../query_bar_wrapper';

const isFieldHistogram = (fields, indexPattern, field) => {
  const indexFields = fields[getIndexPatternKey(indexPattern)];
  if (!indexFields) return false;
  const fieldObject = indexFields.find((f) => f.name === field);
  if (!fieldObject) return false;
  return fieldObject.type === KBN_FIELD_TYPES.HISTOGRAM;
};

export const FilterRatioAgg = (props) => {
  const { series, fields, panel } = props;

  const handleChange = useMemo(
    () => createChangeHandler(props.onChange, props.model),
    [props.model, props.onChange]
  );
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumeratorQueryChange = useCallback(
    (query) => handleChange({ numerator: query }),
    [handleChange]
  );
  const handleDenominatorQueryChange = useCallback(
    (query) => handleChange({ denominator: query }),
    [handleChange]
  );
  const indexPattern = series.override_index_pattern
    ? series.series_index_pattern
    : panel.index_pattern;

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
              data-test-subj="filterRatioNumeratorInput"
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
              data-test-subj="filterRatioDenominatorInput"
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
            <FieldSelect
              label={
                <FormattedMessage
                  id="visTypeTimeseries.filterRatio.fieldLabel"
                  defaultMessage="Field"
                />
              }
              fields={fields}
              type={model.metric_agg}
              restrict={getSupportedFieldsByMetricType(model.metric_agg)}
              indexPattern={indexPattern}
              value={model.field}
              onChange={(value) =>
                handleChange({
                  field: value?.[0],
                })
              }
            />
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
