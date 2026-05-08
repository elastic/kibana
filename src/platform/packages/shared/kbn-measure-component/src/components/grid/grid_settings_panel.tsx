/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiColorPicker,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GridConfig, GridType } from './grid_overlay';

interface Props {
  config: GridConfig;
  defaultConfig: GridConfig;
  setConfig: Dispatch<SetStateAction<GridConfig>>;
}

const typeOptions: Array<{ value: GridType; text: string }> = [
  { value: 'stretch', text: 'Stretch' },
  { value: 'center', text: 'Center' },
  { value: 'left', text: 'Left' },
  { value: 'right', text: 'Right' },
];

export const GridSettingsPanel = ({ config, defaultConfig, setConfig }: Props) => {
  const columnsId = useGeneratedHtmlId({ prefix: 'gridColumns' });
  const typeId = useGeneratedHtmlId({ prefix: 'gridType' });
  const widthId = useGeneratedHtmlId({ prefix: 'gridWidth' });
  const gutterId = useGeneratedHtmlId({ prefix: 'gridGutter' });
  const marginId = useGeneratedHtmlId({ prefix: 'gridMargin' });

  const updateConfig = (partial: Partial<GridConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  return (
    <EuiForm component="div">
      <EuiFormRow
        label={i18n.translate('kbnMeasureComponent.gridSettings.columns', {
          defaultMessage: 'Column count',
        })}
      >
        <EuiFieldNumber
          id={columnsId}
          value={config.columns}
          onChange={(e) => updateConfig({ columns: Math.max(1, Number(e.target.value)) })}
          min={1}
          max={24}
          compressed
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('kbnMeasureComponent.gridSettings.type', {
          defaultMessage: 'Type',
        })}
      >
        <EuiSelect
          id={typeId}
          options={typeOptions}
          value={config.type}
          onChange={(e) => updateConfig({ type: e.target.value as GridType })}
          compressed
        />
      </EuiFormRow>
      {config.type !== 'stretch' && (
        <EuiFormRow
          label={i18n.translate('kbnMeasureComponent.gridSettings.width', {
            defaultMessage: 'Column width',
          })}
        >
          <EuiFieldNumber
            id={widthId}
            value={config.width || ''}
            placeholder="Auto"
            onChange={(e) => updateConfig({ width: Math.max(0, Number(e.target.value) || 0) })}
            min={0}
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
          onChange={(e) => updateConfig({ gutterSize: Math.max(0, Number(e.target.value)) })}
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
          onChange={(e) => updateConfig({ marginSize: Math.max(0, Number(e.target.value)) })}
          min={0}
          append="px"
          compressed
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('kbnMeasureComponent.gridSettings.color', {
          defaultMessage: 'Color',
        })}
      >
        <EuiColorPicker
          color={config.color}
          onChange={(color) => updateConfig({ color })}
          showAlpha
          compressed
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiButton
        size="s"
        onClick={() => setConfig(defaultConfig)}
        data-test-subj="gridSettingsResetButton"
      >
        {i18n.translate('kbnMeasureComponent.gridSettings.reset', {
          defaultMessage: 'Reset to default',
        })}
      </EuiButton>
    </EuiForm>
  );
};
