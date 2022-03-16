/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { AggSelect } from './agg_select';
import { FieldSelect } from './field_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createNumberHandler } from '../lib/create_number_handler';
import {
  htmlIdGenerator,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';
import { Percentiles, newPercentile } from './percentile_ui';
import { PercentileHdr } from './percentile_hdr';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM];

const checkModel = (model) => Array.isArray(model.percentiles);

export function PercentileAgg(props) {
  const { series, model, panel, fields } = props;
  const htmlId = htmlIdGenerator();

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumberChange = createNumberHandler(handleChange);

  const indexPattern = series.override_index_pattern
    ? series.series_index_pattern
    : panel.index_pattern;

  useEffect(() => {
    if (!checkModel(model)) {
      handleChange({
        percentiles: [newPercentile({ value: 50 })],
      });
    }
  }, [handleChange, model]);

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
      dragHandleProps={props.dragHandleProps}
    >
      <EuiFlexGrid gutterSize="s" columns={2}>
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="visTypeTimeseries.percentile.aggregationLabel"
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
          <FieldSelect
            label={
              <FormattedMessage
                id="visTypeTimeseries.percentile.fieldLabel"
                defaultMessage="Field"
              />
            }
            fields={fields}
            type={model.type}
            restrict={RESTRICT_FIELDS}
            indexPattern={indexPattern}
            value={model.field}
            onChange={(value) =>
              handleChange({
                field: value?.[0],
              })
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="visTypeTimeseries.percentile.percents"
                defaultMessage="Percents"
              />
            }
          >
            <Percentiles
              onChange={handleChange}
              name="percentiles"
              model={model}
              panel={panel}
              seriesId={series.id}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <PercentileHdr
            value={model.numberOfSignificantValueDigits}
            onChange={handleNumberChange('numberOfSignificantValueDigits')}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </AggRow>
  );
}

PercentileAgg.propTypes = {
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
