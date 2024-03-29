/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { AggSelect } from './agg_select';
import { MetricSelect } from './metric_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

export const DerivativeAgg = (props) => {
  const { siblings, fields, indexPattern } = props;

  const defaults = { unit: '' };
  const model = { ...defaults, ...props.model };

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

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
              id="visTypeTimeseries.derivative.aggregationLabel"
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
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('metric')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.derivative.metricLabel"
                defaultMessage="Metric"
              />
            }
            fullWidth
          >
            <MetricSelect
              onChange={handleSelectChange('field')}
              metrics={siblings}
              metric={model}
              fields={fields[getIndexPatternKey(indexPattern)]}
              value={model.field}
              exclude={[TSVB_METRIC_TYPES.TOP_HIT]}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('units')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.derivative.unitsLabel"
                defaultMessage="Units (1s, 1m, etc)"
                description="1s and 1m are required values and must not be translated."
              />
            }
            fullWidth
          >
            <EuiFieldText onChange={handleTextChange('unit')} value={model.unit} fullWidth />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
};

DerivativeAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  indexPattern: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};
