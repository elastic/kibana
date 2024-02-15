/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { i18n } from '@kbn/i18n';

const options = [
  { label: 'search-index1', key: 'id-1' },
  { label: 'search-index1', key: 'id-1' },
];

export const AddIndicesField = ({ addIndices }) => {
  const [selectedIndices, setSelectedIndices] = React.useState<string[]>([]);
  const handleAddIndices = () => {
    addIndices(selectedIndices);
  };
  const onChange = (selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedIndices(
      selectedOptions.filter((option) => option && !!option.key).map((option) => option.key)
    );
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem>
        <EuiComboBox
          placeholder={i18n.translate('aiPlayground.sources.addIndex.placeholder', {
            defaultMessage: 'Add new data source',
          })}
          fullWidth
          options={options}
          selectedOptions={selectedIndices.map(
            (index) => options.find((option) => option.key === index)!
          )}
          onChange={onChange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon display="base" iconType="plusInCircle" size="m" onClick={handleAddIndices} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
