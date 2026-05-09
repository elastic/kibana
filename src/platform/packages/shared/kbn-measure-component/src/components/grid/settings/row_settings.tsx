/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber, EuiSelect, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GridConfig, GridRowAlignType } from '../../../lib/grid';

const alignOptions: Array<{ value: GridRowAlignType; text: string }> = [
  { value: 'stretch', text: 'Stretch' },
  { value: 'center', text: 'Center' },
  { value: 'top', text: 'Top' },
  { value: 'bottom', text: 'Bottom' },
];

interface Props {
  config: GridConfig;
  onChange: (partial: Partial<GridConfig>) => void;
}

export const RowSettings = ({ config, onChange }: Props) => {
  const countId = useGeneratedHtmlId({ prefix: 'gridCount' });
  const alignTypeId = useGeneratedHtmlId({ prefix: 'gridRowAlignType' });
  const heightId = useGeneratedHtmlId({ prefix: 'gridHeight' });
  const gutterId = useGeneratedHtmlId({ prefix: 'gridGutter' });
  const marginId = useGeneratedHtmlId({ prefix: 'gridMargin' });

  return (
    <>
      <EuiFormRow
        label={i18n.translate('kbnMeasureComponent.gridSettings.count', {
          defaultMessage: 'Count',
        })}
      >
        <EuiFieldNumber
          id={countId}
          value={config.count}
          onChange={(e) => onChange({ count: Math.max(1, Number(e.target.value)) })}
          min={1}
          max={24}
          compressed
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('kbnMeasureComponent.gridSettings.alignType', {
          defaultMessage: 'Align',
        })}
      >
        <EuiSelect
          id={alignTypeId}
          options={alignOptions}
          value={config.rowAlignType}
          onChange={(e) => onChange({ rowAlignType: e.target.value as GridRowAlignType })}
          compressed
        />
      </EuiFormRow>
      {config.rowAlignType !== 'stretch' && (
        <EuiFormRow
          label={i18n.translate('kbnMeasureComponent.gridSettings.height', {
            defaultMessage: 'Height',
          })}
        >
          <EuiFieldNumber
            id={heightId}
            value={config.height || ''}
            placeholder="Auto"
            onChange={(e) => onChange({ height: Math.max(0, Number(e.target.value) || 0) })}
            min={0}
            append="px"
            compressed
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={i18n.translate('kbnMeasureComponent.gridSettings.gutter', {
          defaultMessage: 'Gutter',
        })}
      >
        <EuiFieldNumber
          id={gutterId}
          value={config.gutterSize}
          onChange={(e) => onChange({ gutterSize: Math.max(0, Number(e.target.value)) })}
          min={0}
          append="px"
          compressed
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('kbnMeasureComponent.gridSettings.margin', {
          defaultMessage: 'Margin',
        })}
      >
        <EuiFieldNumber
          id={marginId}
          value={config.marginSize}
          onChange={(e) => onChange({ marginSize: Math.max(0, Number(e.target.value)) })}
          min={0}
          append="px"
          compressed
        />
      </EuiFormRow>
    </>
  );
};
