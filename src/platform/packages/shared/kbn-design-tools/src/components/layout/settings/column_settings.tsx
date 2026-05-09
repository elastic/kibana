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
import type { LayoutConfig, LayoutAlignType } from '../../../lib/layout';

const alignOptions: Array<{ value: LayoutAlignType; text: string }> = [
  { value: 'stretch', text: 'Stretch' },
  { value: 'center', text: 'Center' },
  { value: 'left', text: 'Left' },
  { value: 'right', text: 'Right' },
];

interface Props {
  config: LayoutConfig;
  onChange: (partial: Partial<LayoutConfig>) => void;
}

export const ColumnSettings = ({ config, onChange }: Props) => {
  const countId = useGeneratedHtmlId({ prefix: 'layoutCount' });
  const alignTypeId = useGeneratedHtmlId({ prefix: 'layoutAlignType' });
  const widthId = useGeneratedHtmlId({ prefix: 'layoutWidth' });
  const gutterId = useGeneratedHtmlId({ prefix: 'layoutGutter' });
  const marginId = useGeneratedHtmlId({ prefix: 'layoutMargin' });

  return (
    <>
      <EuiFormRow
        label={i18n.translate('kbnDesignTools.layoutSettings.count', {
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
        label={i18n.translate('kbnDesignTools.layoutSettings.alignType', {
          defaultMessage: 'Align',
        })}
      >
        <EuiSelect
          id={alignTypeId}
          options={alignOptions}
          value={config.alignType}
          onChange={(e) => onChange({ alignType: e.target.value as LayoutAlignType })}
          compressed
        />
      </EuiFormRow>
      {config.alignType !== 'stretch' && (
        <EuiFormRow
          label={i18n.translate('kbnDesignTools.layoutSettings.width', {
            defaultMessage: 'Width',
          })}
        >
          <EuiFieldNumber
            id={widthId}
            value={config.width || ''}
            placeholder="Auto"
            onChange={(e) => onChange({ width: Math.max(0, Number(e.target.value) || 0) })}
            min={0}
            append="px"
            compressed
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={i18n.translate('kbnDesignTools.layoutSettings.gutter', {
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
        label={i18n.translate('kbnDesignTools.layoutSettings.margin', {
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
