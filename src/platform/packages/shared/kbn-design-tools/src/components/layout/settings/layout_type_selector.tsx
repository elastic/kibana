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
import type { LayoutConfig, LayoutType } from '../../../lib/layout';

const layoutTypeOptions: Array<{ value: LayoutType; text: string }> = [
  { value: 'columns', text: 'Columns' },
  { value: 'rows', text: 'Rows' },
  { value: 'grid', text: 'Grid' },
];

interface Props {
  layoutType: LayoutType;
  onChange: (partial: Partial<LayoutConfig>) => void;
}

export const LayoutTypeSelector = ({ layoutType, onChange }: Props) => {
  const layoutTypeId = useGeneratedHtmlId({ prefix: 'layoutType' });

  return (
    <EuiFormRow
      label={i18n.translate('kbnDesignTools.layoutSettings.layoutType', {
        defaultMessage: 'Layout',
      })}
    >
      <EuiSelect
        id={layoutTypeId}
        options={layoutTypeOptions}
        value={layoutType}
        onChange={(e) => onChange({ layoutType: e.target.value as LayoutType })}
        compressed
        data-test-subj="layoutTypeSelect"
      />
    </EuiFormRow>
  );
};
