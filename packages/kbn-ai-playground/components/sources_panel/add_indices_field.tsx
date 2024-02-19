/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryIndices } from '../../hooks/useQueryIndices';

interface AddIndicesFieldProps {
  indices: string[];
  selectedIndices: string[];
  onIndexSelect: (index: string) => void;
}

export const AddIndicesField: React.FC<AddIndicesFieldProps> = ({
  selectedIndices,
  indices,
  onIndexSelect,
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('aiPlayground.sources.addIndex.label', {
      defaultMessage: 'Add index',
    })}
    labelType="legend"
  >
    <EuiSuperSelect
      placeholder={i18n.translate('aiPlayground.sources.addIndex.placeholder', {
        defaultMessage: 'Select new data source',
      })}
      fullWidth
      options={indices.map((index) => ({
        value: index,
        inputDisplay: index,
        disabled: selectedIndices.includes(index),
      }))}
      onChange={onIndexSelect}
      hasDividers
    />
  </EuiFormRow>
);
