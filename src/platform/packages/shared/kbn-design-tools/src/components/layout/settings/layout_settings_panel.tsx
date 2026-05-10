/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { EuiButton, EuiForm, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LayoutConfig } from '../../../lib/layout';
import { LayoutTypeSelector, ColumnSettings, RowSettings, GridCellSettings, ColorSetting } from '.';

interface Props {
  config: LayoutConfig;
  defaultConfig: LayoutConfig;
  setConfig: Dispatch<SetStateAction<LayoutConfig>>;
}

export const LayoutSettingsPanel = ({ config, defaultConfig, setConfig }: Props) => {
  const updateConfig = useCallback(
    (partial: Partial<LayoutConfig>) => {
      setConfig((prev) => ({ ...prev, ...partial }));
    },
    [setConfig]
  );

  const resetLayoutDefaults = useCallback(() => {
    const { layoutType } = config;
    if (layoutType === 'grid') {
      setConfig((prev) => ({
        ...prev,
        cellSize: defaultConfig.cellSize,
        color: defaultConfig.color,
      }));
    } else if (layoutType === 'rows') {
      setConfig((prev) => ({
        ...prev,
        count: defaultConfig.count,
        rowAlignType: defaultConfig.rowAlignType,
        height: defaultConfig.height,
        gutterSize: defaultConfig.gutterSize,
        marginSize: defaultConfig.marginSize,
        color: defaultConfig.color,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        count: defaultConfig.count,
        alignType: defaultConfig.alignType,
        width: defaultConfig.width,
        gutterSize: defaultConfig.gutterSize,
        marginSize: defaultConfig.marginSize,
        color: defaultConfig.color,
      }));
    }
  }, [config, defaultConfig, setConfig]);

  return (
    <EuiForm component="div">
      <LayoutTypeSelector layoutType={config.layoutType} onChange={updateConfig} />
      <EuiHorizontalRule margin="s" />
      {config.layoutType === 'grid' && <GridCellSettings config={config} onChange={updateConfig} />}
      {config.layoutType === 'columns' && (
        <ColumnSettings config={config} onChange={updateConfig} />
      )}
      {config.layoutType === 'rows' && <RowSettings config={config} onChange={updateConfig} />}
      <ColorSetting color={config.color} onChange={updateConfig} />
      <EuiSpacer size="m" />
      <EuiButton size="s" onClick={resetLayoutDefaults} data-test-subj="layoutSettingsResetButton">
        {i18n.translate('kbnDesignTools.layoutSettings.reset', {
          defaultMessage: 'Reset to default',
        })}
      </EuiButton>
    </EuiForm>
  );
};
