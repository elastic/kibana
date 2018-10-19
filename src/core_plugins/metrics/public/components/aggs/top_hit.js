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
  EuiComboBox,
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
      label: intl.formatMessage({ id: 'metrics.topHit.aggWithOptions.averageLabel', defaultMessage: 'Avg' }),
      value: 'avg',
    },
    {
      label: intl.formatMessage({ id: 'metrics.topHit.aggWithOptions.maxLabel', defaultMessage: 'Max' }),
      value: 'max'
    },
    {
      label: intl.formatMessage({ id: 'metrics.topHit.aggWithOptions.minLabel', defaultMessage: 'Min' }),
      value: 'min'
    },
    {
      label: intl.formatMessage({ id: 'metrics.topHit.aggWithOptions.sumLabel', defaultMessage: 'Sum' }),
      value: 'sum'
    },
  ];

  const orderOptions = [
    {
      label: intl.formatMessage({ id: 'metrics.topHit.orderOptions.ascLabel', defaultMessage: 'Asc' }),
      value: 'asc'
    },
    {
      label: intl.formatMessage({ id: 'metrics.topHit.orderOptions.descLabel', defaultMessage: 'Desc' }),
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
      <div className="vis_editor__row_item">
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <div className="vis_editor__label">
              <FormattedMessage
                id="metrics.topHit.aggregationLabel"
                defaultMessage="Aggregation"
              />
            </div>
            <AggSelect
              panelType={props.panel.type}
              siblings={props.siblings}
              value={model.type}
              onChange={handleSelectChange('type')}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('field')}>
              <FormattedMessage
                id="metrics.topHit.fieldLabel"
                defaultMessage="Field"
              />
            </label>
            <FieldSelect
              id={htmlId('field')}
              fields={fields}
              type={model.type}
              restrict="numeric"
              indexPattern={indexPattern}
              value={model.field}
              onChange={handleSelectChange('field')}
            />
          </div>
        </div>
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('size')}>
              <FormattedMessage
                id="metrics.topHit.sizeLabel"
                defaultMessage="Size"
              />
            </label>
            <input
              id={htmlId('size')}
              className="vis_editor__input-grows-100"
              value={model.size}
              onChange={handleTextChange('size')}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('agg_with')}>
              <FormattedMessage
                id="metrics.topHit.aggregateWithLabel"
                defaultMessage="Aggregate with"
              />
            </label>
            <EuiComboBox
              isClearable={false}
              id={htmlId('agg_with')}
              placeholder={intl.formatMessage({ id: 'metrics.topHit.aggregateWith.selectPlaceholder', defaultMessage: 'Select…' })}
              options={aggWithOptions}
              selectedOptions={selectedAggWithOption ? [selectedAggWithOption] : []}
              onChange={handleSelectChange('agg_with')}
              singleSelection={true}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('order_by')}>
              <FormattedMessage
                id="metrics.topHit.orderByLabel"
                defaultMessage="Order by"
              />
            </label>
            <FieldSelect
              id={htmlId('order_by')}
              restrict="date"
              value={model.order_by}
              onChange={handleSelectChange('order_by')}
              indexPattern={indexPattern}
              fields={fields}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('order')}>
              <FormattedMessage
                id="metrics.topHit.orderLabel"
                defaultMessage="Order"
              />
            </label>
            <EuiComboBox
              isClearable={false}
              id={htmlId('order')}
              placeholder={intl.formatMessage({ id: 'metrics.topHit.order.selectPlaceholder', defaultMessage: 'Select…' })}
              options={orderOptions}
              selectedOptions={selectedOrderOption ? [selectedOrderOption] : []}
              onChange={handleSelectChange('order')}
              singleSelection={true}
            />
          </div>
        </div>
      </div>
    </AggRow>
  );
};

export const TopHitAgg = injectI18n(TopHitAggUi);
