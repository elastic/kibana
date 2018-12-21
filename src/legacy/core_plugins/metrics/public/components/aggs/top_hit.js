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

import React from 'react';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiComboBox,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

const TopHitAggUi = props => {
  const { fields, series, panel, intl } = props;
  const defaults = {
    agg_with: 'avg',
    size: 1,
    order: 'desc',
  };
  const model = { ...defaults, ...props.model };
  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) ||
    panel.index_pattern;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const aggWithOptions = [
    {
      label: intl.formatMessage({ id: 'tsvb.topHit.aggWithOptions.averageLabel', defaultMessage: 'Avg' }),
      value: 'avg',
    },
    {
      label: intl.formatMessage({ id: 'tsvb.topHit.aggWithOptions.maxLabel', defaultMessage: 'Max' }),
      value: 'max'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.topHit.aggWithOptions.minLabel', defaultMessage: 'Min' }),
      value: 'min'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.topHit.aggWithOptions.sumLabel', defaultMessage: 'Sum' }),
      value: 'sum'
    },
  ];

  const orderOptions = [
    {
      label: intl.formatMessage({ id: 'tsvb.topHit.orderOptions.ascLabel', defaultMessage: 'Asc' }),
      value: 'asc'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.topHit.orderOptions.descLabel', defaultMessage: 'Desc' }),
      value: 'desc'
    },
  ];

  const htmlId = htmlIdGenerator();
  const selectedAggWithOption = aggWithOptions.find(option => {
    return model.agg_with === option.value;
  });
  const selectedOrderOption = orderOptions.find(option => {
    return model.order === option.value;
  });
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
              id="tsvb.topHit.aggregationLabel"
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
              id="tsvb.topHit.fieldLabel"
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

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('size')}
            label={(<FormattedMessage
              id="tsvb.topHit.sizeLabel"
              defaultMessage="Size"
            />)}
          >
            {/*
              EUITODO: The following input couldn't be converted to EUI because of type mis-match.
              Should it be text or number?
            */}
            <input
              className="tvbAgg__input"
              value={model.size}
              onChange={handleTextChange('size')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('agg_with')}
            label={(<FormattedMessage
              id="tsvb.topHit.aggregateWithLabel"
              defaultMessage="Aggregate with"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              placeholder={intl.formatMessage({ id: 'tsvb.topHit.aggregateWith.selectPlaceholder', defaultMessage: 'Select…' })}
              options={aggWithOptions}
              selectedOptions={selectedAggWithOption ? [selectedAggWithOption] : []}
              onChange={handleSelectChange('agg_with')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('order_by')}
            label={(<FormattedMessage
              id="tsvb.topHit.orderByLabel"
              defaultMessage="Order by"
            />)}
          >
            <FieldSelect
              restrict="date"
              value={model.order_by}
              onChange={handleSelectChange('order_by')}
              indexPattern={indexPattern}
              fields={fields}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('order')}
            label={(<FormattedMessage
              id="tsvb.topHit.orderLabel"
              defaultMessage="Order"
            />)}
          >
            <EuiComboBox
              isClearable={false}
              placeholder={intl.formatMessage({ id: 'tsvb.topHit.order.selectPlaceholder', defaultMessage: 'Select…' })}
              options={orderOptions}
              selectedOptions={selectedOrderOption ? [selectedOrderOption] : []}
              onChange={handleSelectChange('order')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
};

export const TopHitAgg = injectI18n(TopHitAggUi);
