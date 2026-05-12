/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LayoutConfig } from '../../../lib/layout';

interface Props {
  config: LayoutConfig;
  onChange: (partial: Partial<LayoutConfig>) => void;
}

export const GridCellSettings = ({ config, onChange }: Props) => {
  const cellSizeId = useGeneratedHtmlId({ prefix: 'gridCellSize' });

  return (
    <EuiFormRow
      label={i18n.translate('kbnDesignTools.layout.settings.cellSize', {
        defaultMessage: 'Size',
      })}
    >
      <EuiFieldNumber
        id={cellSizeId}
        value={config.cellSize}
        onChange={(e) => onChange({ cellSize: Math.max(1, Number(e.target.value)) })}
        min={1}
        append="px"
        compressed
      />
    </EuiFormRow>
  );
};
