/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiSelect, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GridConfig, GridLayoutType } from '../../../lib/grid';

const layoutTypeOptions: Array<{ value: GridLayoutType; text: string }> = [
  { value: 'columns', text: 'Columns' },
  { value: 'rows', text: 'Rows' },
  { value: 'grid', text: 'Grid' },
];

interface Props {
  layoutType: GridLayoutType;
  onChange: (partial: Partial<GridConfig>) => void;
}

export const LayoutTypeSelector = ({ layoutType, onChange }: Props) => {
  const layoutTypeId = useGeneratedHtmlId({ prefix: 'gridLayoutType' });

  return (
    <EuiFormRow
      label={i18n.translate('kbnMeasureComponent.gridSettings.layoutType', {
        defaultMessage: 'Layout',
      })}
    >
      <EuiSelect
        id={layoutTypeId}
        options={layoutTypeOptions}
        value={layoutType}
        onChange={(e) => onChange({ layoutType: e.target.value as GridLayoutType })}
        compressed
        data-test-subj="gridLayoutTypeSelect"
      />
    </EuiFormRow>
  );
};
