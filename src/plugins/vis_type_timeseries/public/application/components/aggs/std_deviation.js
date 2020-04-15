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
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { KBN_FIELD_TYPES } from '../../../../../../plugins/data/public';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.NUMBER];

const StandardDeviationAggUi = props => {
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

  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) || panel.index_pattern;
  const htmlId = htmlIdGenerator();
  const selectedModeOption = modeOptions.find(option => {
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
          <EuiFormRow
            id={htmlId('field')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.stdDeviation.fieldLabel"
                defaultMessage="Field"
              />
            }
          >
            <FieldSelect
              fields={fields}
              type={model.type}
              restrict={RESTRICT_FIELDS}
              indexPattern={indexPattern}
              value={model.field}
              onChange={handleSelectChange('field')}
            />
          </EuiFormRow>
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
