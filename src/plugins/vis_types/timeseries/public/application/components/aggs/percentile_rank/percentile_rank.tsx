/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { FormattedMessage } from '@kbn/i18n-react';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { AggSelect } from '../agg_select';
import { FieldSelect } from '../field_select';
// @ts-ignore
import { createChangeHandler } from '../../lib/create_change_handler';
import { createSelectHandler } from '../../lib/create_select_handler';
import { createNumberHandler } from '../../lib/create_number_handler';

import { AggRow } from '../agg_row';
import { PercentileRankValues } from './percentile_rank_values';

import type { Metric, Panel, SanitizedFieldType, Series } from '../../../../../common/types';
import { TSVB_DEFAULT_COLOR } from '../../../../../common/constants';

import { DragHandleProps } from '../../../../types';
import { PercentileHdr } from '../percentile_hdr';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM];

interface PercentileRankAggProps {
  disableDelete: boolean;
  fields: Record<string, SanitizedFieldType[]>;
  indexPattern: string;
  model: Metric;
  panel: Panel;
  siblings: Metric[];
  series: Series;
  dragHandleProps: DragHandleProps;
  onAdd(): void;
  onChange(partialModel: Record<string, unknown>): void;
  onDelete(): void;
}

export const PercentileRankAgg = (props: PercentileRankAggProps) => {
  const { panel, fields, indexPattern } = props;
  const defaults = { values: [''], colors: [TSVB_DEFAULT_COLOR] };
  const model = { ...defaults, ...props.model };

  const htmlId = htmlIdGenerator();
  const isTablePanel = panel.type === 'table';
  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumberChange = createNumberHandler(handleChange);
  const percentileRankSeries =
    panel.series.find((s) => s.id === props.series.id) || panel.series[0];
  // If the series is grouped by, then these colors are not respected, no need to display the color picker */
  const isGroupedBy = panel.series.length > 0 && percentileRankSeries.split_mode !== 'everything';
  const enableColorPicker = !isGroupedBy && !['table', 'metric', 'markdown'].includes(panel.type);

  const handlePercentileRankValuesChange = (values: Metric['values'], colors: Metric['colors']) => {
    handleChange({
      ...model,
      values,
      colors,
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
          <FieldSelect
            label={
              <FormattedMessage
                id="visTypeTimeseries.percentileRank.fieldLabel"
                defaultMessage="Field"
              />
            }
            fields={fields}
            type={model.type}
            restrict={RESTRICT_FIELDS}
            indexPattern={indexPattern}
            value={model.field ?? ''}
            onChange={(value) =>
              props.onChange({
                field: value?.[0],
              })
            }
          />
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
              values={model.values!}
              colors={model.colors!}
              onChange={handlePercentileRankValuesChange}
              enableColorPicker={enableColorPicker}
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
