/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBox } from '@elastic/eui';
import React, { useState } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { i18n } from '@kbn/i18n';
import { useQueryIndices } from '../../hooks/useQueryIndices';

export const AddIndicesField = ({ addIndices, indices }) => {
  const [query, setQuery] = useState<string>('');
  const { options, isLoading } = useQueryIndices(query);

  const onChange = (selectedOptions: EuiComboBoxOptionOption[]) => {
    addIndices(selectedOptions.map((option) => option.label));
  };

  const onSearchChange = (searchValue: string) => {
    setQuery(searchValue);
  };

  return (
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
  );
};
