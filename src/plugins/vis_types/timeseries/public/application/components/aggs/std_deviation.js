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
import { createTextHandler } from '../lib/create_text_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

const RESTRICT_FIELDS = KBN_FIELD_TYPES.NUMBER;

const StandardDeviationAggUi = (props) => {
  const { series, panel, fields, intl } = props;
  const defaults = { sigma: '' };
  const model = { ...defaults, ...props.model };

  const modeOptions = [
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.stdDeviation.modeOptions.rawLabel',
        defaultMessage: 'Raw',
      }),
      value: 'raw',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.stdDeviation.modeOptions.upperBoundLabel',
        defaultMessage: 'Upper Bound',
      }),
      value: 'upper',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.stdDeviation.modeOptions.lowerBoundLabel',
        defaultMessage: 'Lower Bound',
      }),
      value: 'lower',
    },
  ];

  if (panel.type !== 'table') {
    modeOptions.push({
      label: intl.formatMessage({
        id: 'visTypeTimeseries.stdDeviation.modeOptions.boundsBandLabel',
        defaultMessage: 'Bounds Band',
      }),
      value: 'band',
    });
  }

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const indexPattern = series.override_index_pattern
    ? series.series_index_pattern
    : panel.index_pattern;
  const htmlId = htmlIdGenerator();
  const selectedModeOption = modeOptions.find((option) => {
    return model.mode === option.value;
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
              id="visTypeTimeseries.stdDeviation.aggregationLabel"
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
                id="visTypeTimeseries.stdDeviation.fieldLabel"
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
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('sigma')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.stdDeviation.sigmaLabel"
                defaultMessage="Sigma"
              />
            }
          >
            <EuiFieldText value={model.sigma} onChange={handleTextChange('sigma')} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('mode')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.stdDeviation.modeLabel"
                defaultMessage="Mode"
              />
            }
          >
            <EuiComboBox
              options={modeOptions}
              selectedOptions={selectedModeOption ? [selectedModeOption] : []}
              onChange={handleSelectChange('mode')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
};

StandardDeviationAggUi.propTypes = {
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

export const StandardDeviationAgg = injectI18n(StandardDeviationAggUi);
