/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useEffect } from 'react';
import { AggRow } from './agg_row';
import { AggSelect } from './agg_select';
import { FieldSelect } from './field_select';
import { i18n } from '@kbn/i18n';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiComboBox,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { PANEL_TYPES } from '../../../../common/enums';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

const isFieldTypeEnabled = (fieldRestrictions, fieldType) =>
  fieldRestrictions.length ? fieldRestrictions.includes(fieldType) : true;

const getAggWithOptions = (field = {}, fieldTypesRestriction) => {
  if (isFieldTypeEnabled(fieldTypesRestriction, field.type)) {
    switch (field.type) {
      case KBN_FIELD_TYPES.NUMBER:
        return [
          {
            label: i18n.translate('visTypeTimeseries.topHit.aggWithOptions.averageLabel', {
              defaultMessage: 'Avg',
            }),
            value: 'avg',
          },
          {
            label: i18n.translate('visTypeTimeseries.topHit.aggWithOptions.maxLabel', {
              defaultMessage: 'Max',
            }),
            value: 'max',
          },
          {
            label: i18n.translate('visTypeTimeseries.topHit.aggWithOptions.minLabel', {
              defaultMessage: 'Min',
            }),
            value: 'min',
          },
          {
            label: i18n.translate('visTypeTimeseries.topHit.aggWithOptions.sumLabel', {
              defaultMessage: 'Sum',
            }),
            value: 'sum',
          },
        ];
      case KBN_FIELD_TYPES.STRING:
      case KBN_FIELD_TYPES.DATE:
        return [
          {
            label: i18n.translate('visTypeTimeseries.topHit.aggWithOptions.concatenate', {
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
    label: i18n.translate('visTypeTimeseries.topHit.orderOptions.ascLabel', {
      defaultMessage: 'Asc',
    }),
    value: 'asc',
  },
  {
    label: i18n.translate('visTypeTimeseries.topHit.orderOptions.descLabel', {
      defaultMessage: 'Desc',
    }),
    value: 'desc',
  },
];

const AGG_WITH_KEY = 'agg_with';
const ORDER_DATE_RESTRICT_FIELDS = [KBN_FIELD_TYPES.DATE];

const getModelDefaults = () => ({
  size: 1,
  order: 'desc',
  [AGG_WITH_KEY]: 'noop',
});

const TopHitAggUi = (props) => {
  const { fields, series, panel } = props;
  const model = useMemo(() => ({ ...getModelDefaults(), ...props.model }), [props.model]);
  const indexPattern = series.override_index_pattern
    ? series.series_index_pattern
    : panel.index_pattern;

  const aggWithOptionsRestrictFields = [
    PANEL_TYPES.TABLE,
    PANEL_TYPES.METRIC,
    PANEL_TYPES.MARKDOWN,
  ].includes(panel.type)
    ? [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING, KBN_FIELD_TYPES.DATE]
    : [KBN_FIELD_TYPES.NUMBER];

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);
  const fieldsSelector = getIndexPatternKey(indexPattern);
  const field = fields?.[fieldsSelector]?.find((f) => f.name === model.field);
  const aggWithOptions = getAggWithOptions(field, aggWithOptionsRestrictFields);
  const orderOptions = getOrderOptions();

  const htmlId = htmlIdGenerator();

  const selectedAggWithOption = aggWithOptions.find((option) => {
    return model[AGG_WITH_KEY] === option.value;
  });

  const selectedOrderOption = orderOptions.find((option) => {
    return model.order === option.value;
  });

  useEffect(() => {
    const defaultFn = aggWithOptions?.[0]?.value;
    const aggWith = model[AGG_WITH_KEY];
    if (aggWith && defaultFn && aggWith !== defaultFn && !selectedAggWithOption) {
      handleChange({
        [AGG_WITH_KEY]: defaultFn,
      });
    }
  }, [model, selectedAggWithOption, aggWithOptions, handleChange]);

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
              id="visTypeTimeseries.topHit.aggregationLabel"
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
              <FormattedMessage id="visTypeTimeseries.topHit.fieldLabel" defaultMessage="Field" />
            }
            fields={fields}
            type={model.type}
            restrict={aggWithOptionsRestrictFields}
            indexPattern={indexPattern}
            value={model.field}
            onChange={(value) =>
              handleChange({
                field: value?.[0],
              })
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('size')}
            label={
              <FormattedMessage id="visTypeTimeseries.topHit.sizeLabel" defaultMessage="Size" />
            }
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
            id={htmlId(AGG_WITH_KEY)}
            label={
              <FormattedMessage
                id="visTypeTimeseries.topHit.aggregateWithLabel"
                defaultMessage="Aggregate with"
              />
            }
          >
            <EuiComboBox
              isClearable={false}
              placeholder={i18n.translate(
                'visTypeTimeseries.topHit.aggregateWith.selectPlaceholder',
                {
                  defaultMessage: 'Select...',
                }
              )}
              options={aggWithOptions}
              selectedOptions={selectedAggWithOption ? [selectedAggWithOption] : []}
              onChange={handleSelectChange(AGG_WITH_KEY)}
              singleSelection={{ asPlainText: true }}
              data-test-subj="topHitAggregateWithComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            label={
              <FormattedMessage
                id="visTypeTimeseries.topHit.orderByLabel"
                defaultMessage="Order by"
              />
            }
            restrict={ORDER_DATE_RESTRICT_FIELDS}
            value={model.order_by}
            onChange={(value) =>
              handleChange({
                order_by: value?.[0],
              })
            }
            indexPattern={indexPattern}
            fields={fields}
            data-test-subj="topHitOrderByFieldSelect"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('order')}
            label={
              <FormattedMessage id="visTypeTimeseries.topHit.orderLabel" defaultMessage="Order" />
            }
          >
            <EuiComboBox
              isClearable={false}
              placeholder={i18n.translate('visTypeTimeseries.topHit.order.selectPlaceholder', {
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
