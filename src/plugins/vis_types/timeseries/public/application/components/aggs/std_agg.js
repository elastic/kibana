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
import { FieldSelect } from './field_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem, EuiFormLabel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getSupportedFieldsByMetricType } from '../lib/get_supported_fields_by_metric_type';

export function StandardAgg(props) {
  const { model, panel, series, fields, uiRestrictions } = props;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);

  const restrictFields = getSupportedFieldsByMetricType(model.type);
  const indexPattern = series.override_index_pattern
    ? series.series_index_pattern
    : panel.index_pattern;
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
              id="visTypeTimeseries.stdAgg.aggregationLabel"
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

        {model.type !== 'count' ? (
          <EuiFlexItem>
            <FieldSelect
              label={
                <FormattedMessage id="visTypeTimeseries.stdAgg.fieldLabel" defaultMessage="Field" />
              }
              fields={fields}
              type={model.type}
              restrict={restrictFields}
              indexPattern={indexPattern}
              value={model.field}
              onChange={(value) =>
                handleChange({
                  field: value?.[0],
                })
              }
              uiRestrictions={uiRestrictions}
              fullWidth
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </AggRow>
  );
}

StandardAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
  uiRestrictions: PropTypes.object,
};
