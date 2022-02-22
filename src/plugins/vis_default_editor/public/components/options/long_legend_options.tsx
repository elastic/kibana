/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { SwitchOption } from './switch';

const MAX_TRUNCATE_LINES = 5;
const MIN_TRUNCATE_LINES = 1;

export interface LongLegendOptionsProps {
  setValue: (
    paramName: 'maxLegendLines' | 'truncateLegend' | 'legendSize',
    value?: boolean | number
  ) => void;
  truncateLegend: boolean;
  maxLegendLines?: number;
  legendSize?: number;
  'data-test-subj'?: string;
}

function LongLegendOptions({
  'data-test-subj': dataTestSubj,
  setValue,
  truncateLegend,
  maxLegendLines,
  legendSize,
}: LongLegendOptionsProps) {
  return (
    <>
      <SwitchOption
        data-test-subj={dataTestSubj}
        label={i18n.translate('visDefaultEditor.options.longLegends.truncateLegendTextLabel', {
          defaultMessage: 'Truncate legend text',
        })}
        paramName="truncateLegend"
        value={truncateLegend}
        setValue={setValue}
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="visDefaultEditor.options.longLegends.maxLegendLinesLabel"
            defaultMessage="Maximum legend lines"
          />
        }
      >
        <EuiFieldNumber
          data-test-subj="timeSeriesEditorDataMaxLegendLines"
          value={maxLegendLines}
          min={MIN_TRUNCATE_LINES}
          max={MAX_TRUNCATE_LINES}
          fullWidth
          disabled={!Boolean(truncateLegend)}
          onChange={(e) => {
            const val = Number(e.target.value);
            setValue(
              'maxLegendLines',
              Math.min(MAX_TRUNCATE_LINES, Math.max(val, MIN_TRUNCATE_LINES))
            );
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="visDefaultEditor.options.longLegends.legendSizeLabel"
            defaultMessage="Legend size"
          />
        }
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiFieldNumber
              placeholder={i18n.translate(
                'visDefaultEditor.options.longLegends.legendSize.placeholder',
                {
                  defaultMessage: 'Auto',
                }
              )}
              value={legendSize}
              min={1}
              step={1}
              fullWidth
              onChange={(e) => {
                const value = Number(e.target.value) || undefined;
                setValue('legendSize', value);
              }}
              append={i18n.translate(
                'visDefaultEditor.options.longLegends.legendSize.fieldAppend',
                {
                  defaultMessage: 'px',
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="questionInCircle"
              content={
                <FormattedMessage
                  id="visDefaultEditor.options.longLegends.legendSize.tooltip"
                  defaultMessage="Limited to max of 70% of the chart container.
                  Vertical legends limited to min of 30% of chart width."
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
}

export { LongLegendOptions };
