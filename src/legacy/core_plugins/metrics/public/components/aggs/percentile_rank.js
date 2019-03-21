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
import { get, assign, last } from 'lodash';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';

import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFieldNumber,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import AddDeleteButtons from '../add_delete_buttons';

export const PercentileRankAgg = props => {
  const { series, panel, fields } = props;
  const defaults = { values: [''] };
  const model = { ...defaults, ...props.model };

  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
  const htmlId = htmlIdGenerator();

  const isTablePanel = panel.type === 'table';
  const percentileRankValueRows = model.values;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);

  const handlePercentileRankValueChange = (values) => {
    handleChange(assign({}, model, {
      values,
    }));
  };

  const onChangeValue = (index, event) => {
    percentileRankValueRows[index] = get(event, 'target.value');

    handlePercentileRankValueChange(percentileRankValueRows);
  };

  const onDeleteValue = index => (
    handlePercentileRankValueChange(
      percentileRankValueRows
        .filter((item, currentIndex) => index !== currentIndex))
  );

  const onAddValue = () => handlePercentileRankValueChange([...percentileRankValueRows, '']);

  const renderValuesRows = (value, key) => (
    <div className="tvbAggRow__percentileRankValue" key={key}>
      <EuiFlexGroup responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFormLabel htmlFor={htmlId('value')}>
            <FormattedMessage
              id="tsvb.percentileRank.valueLabel"
              defaultMessage="Value:"
            />
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            value={value === '' ? '' : Number(value)}
            placeholder={0}
            onChange={onChangeValue.bind(null, key)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            onAdd={onAddValue}
            onDelete={onDeleteValue.bind(null, key)}
            disableDelete={isTablePanel || percentileRankValueRows.length < 2}
            disableAdd={isTablePanel}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer/>
    </div>
  );

  const percentileRankRenderedRows = percentileRankValueRows.map(renderValuesRows);

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="tsvb.percentileRank.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
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
            label={(<FormattedMessage
              id="tsvb.percentileRank.fieldLabel"
              defaultMessage="Field"
            />)}
          >
            <FieldSelect
              fields={fields}
              type={model.type}
              restrict="numeric"
              indexPattern={indexPattern}
              value={model.field}
              onChange={handleSelectChange('field')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer/>
      <EuiFlexGroup direction="column" responsive={false} gutterSize="xs">
        {isTablePanel ? last(percentileRankRenderedRows) : percentileRankRenderedRows}
      </EuiFlexGroup>
    </AggRow>
  );
};

PercentileRankAgg.propTypes = {
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
