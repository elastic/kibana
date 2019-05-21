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
import { i18n } from '@kbn/i18n';
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
import { ES_TYPES } from '../../../common/es_types';
import { PANEL_TYPES } from '../../../common/panel_types';

const isFieldTypeEnabled = (fieldRestrictions, fieldType) =>
  fieldRestrictions.length ? fieldRestrictions.includes(fieldType) : true;

const getAggWithOptions = (field = {}, fieldTypesRestriction) => {
  if (isFieldTypeEnabled(fieldTypesRestriction, field.type)) {
    switch (field.type) {
      case ES_TYPES.NUMBER:
        return [
          {
            label: i18n.translate('tsvb.topHit.aggWithOptions.averageLabel', {
              defaultMessage: 'Avg',
            }),
            value: 'avg',
          },
          {
            label: i18n.translate('tsvb.topHit.aggWithOptions.maxLabel', {
              defaultMessage: 'Max',
            }),
            value: 'max',
          },
          {
            label: i18n.translate('tsvb.topHit.aggWithOptions.minLabel', {
              defaultMessage: 'Min',
            }),
            value: 'min',
          },
          {
            label: i18n.translate('tsvb.topHit.aggWithOptions.sumLabel', {
              defaultMessage: 'Sum',
            }),
            value: 'sum',
          },
        ];
      case ES_TYPES.KEYWORD:
      case ES_TYPES.STRING:
        return [
          {
            label: i18n.translate('tsvb.topHit.aggWithOptions.concatenate', {
              defaultMessage: 'Concatenate',
            }),
            value: 'concat',
          },
        ];
    }
  }

  return [];
};

const getOrderOptions = () => [
  {
    label: i18n.translate('tsvb.topHit.orderOptions.ascLabel', {
      defaultMessage: 'Asc',
    }),
    value: 'asc',
  },
  {
    label: i18n.translate('tsvb.topHit.orderOptions.descLabel', {
      defaultMessage: 'Desc',
    }),
    value: 'desc',
  },
];

const ORDER_DATE_RESTRICT_FIELDS = [ES_TYPES.DATE];

const TopHitAggUi = props => {
  const { fields, series, panel } = props;
  const defaults = {
    size: 1,
    agg_with: 'noop',
    order: 'desc',
  };
  const model = { ...defaults, ...props.model };
  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) ||
    panel.index_pattern;

  const aggWithOptionsRestrictFields = [
    PANEL_TYPES.TABLE,
    PANEL_TYPES.METRIC,
    PANEL_TYPES.MARKDOWN
  ].includes(panel.type) ? [ES_TYPES.NUMBER, ES_TYPES.KEYWORD, ES_TYPES.STRING] : [ES_TYPES.NUMBER];

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const field = fields[indexPattern].find(f => f.name === model.field);
  const aggWithOptions = getAggWithOptions(field, aggWithOptionsRestrictFields);
  const orderOptions = getOrderOptions();

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
      dragHandleProps={props.dragHandleProps}
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
              restrict={aggWithOptionsRestrictFields}
              indexPattern={indexPattern}
              value={model.field}
              onChange={handleSelectChange('field')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m"/>

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
              placeholder={i18n.translate('tsvb.topHit.aggregateWith.selectPlaceholder', {
                defaultMessage: 'Select...',
              })}
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
              restrict={ORDER_DATE_RESTRICT_FIELDS}
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
              placeholder={i18n.translate('tsvb.topHit.order.selectPlaceholder', {
                defaultMessage: 'Select...',
              })}
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
