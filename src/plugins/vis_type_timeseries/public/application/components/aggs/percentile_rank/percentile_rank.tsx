/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import {
  htmlIdGenerator,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiSpacer,
  EuiFlexGrid,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggSelect } from '../agg_select';
// @ts-ignore
import { FieldSelect } from '../field_select';
// @ts-ignore
import { createChangeHandler } from '../../lib/create_change_handler';
// @ts-ignore
import { createSelectHandler } from '../../lib/create_select_handler';
// @ts-ignore
import { createNumberHandler } from '../../lib/create_number_handler';

import { AggRow } from '../agg_row';
import { PercentileRankValues } from './percentile_rank_values';

import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';
import { MetricsItemsSchema, PanelSchema, SanitizedFieldType } from '../../../../../common/types';
import { DragHandleProps } from '../../../../types';
import { PercentileHdr } from '../percentile_hdr';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM];

interface PercentileRankAggProps {
  disableDelete: boolean;
  fields: Record<string, SanitizedFieldType[]>;
  indexPattern: string;
  model: MetricsItemsSchema;
  panel: PanelSchema;
  siblings: MetricsItemsSchema[];
  dragHandleProps: DragHandleProps;
  onAdd(): void;
  onChange(): void;
  onDelete(): void;
}

export const PercentileRankAgg = (props: PercentileRankAggProps) => {
  const { panel, fields, indexPattern } = props;
  const defaults = { values: [''] };
  const model = { ...defaults, ...props.model };

  const htmlId = htmlIdGenerator();
  const isTablePanel = panel.type === 'table';
  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumberChange = createNumberHandler(handleChange);

  const handlePercentileRankValuesChange = (values: MetricsItemsSchema['values']) => {
    handleChange({
      ...model,
      values,
    });
  };
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
              id="visTypeTimeseries.percentileRank.aggregationLabel"
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
                id="visTypeTimeseries.percentileRank.fieldLabel"
                defaultMessage="Field"
              />
            }
          >
            <FieldSelect
              fields={fields}
              type={model.type}
              restrict={RESTRICT_FIELDS}
              indexPattern={indexPattern}
              value={model.field ?? ''}
              onChange={handleSelectChange('field')}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="visTypeTimeseries.percentileRank.values"
                defaultMessage="Values"
              />
            }
          >
            <PercentileRankValues
              disableAdd={isTablePanel}
              disableDelete={isTablePanel}
              showOnlyLastRow={isTablePanel}
              model={model.values!}
              onChange={handlePercentileRankValuesChange}
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
};
