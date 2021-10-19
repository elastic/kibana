/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { action } from '@storybook/addon-actions';

import { StorybookParams } from '../../services/storybook';
import { IndexPatternPicker, IndexPatternRef } from './index_pattern_picker';

export default {
  component: IndexPatternPicker,
  title: 'Index Pattern Picker',
  description: 'Test',
  argTypes: {},
};

export function Example({}: {} & StorybookParams) {
  const [indexPattern, setIndexPattern] = useState<IndexPatternRef | undefined>(undefined);
  // const [isAddToLibrarySelected, setAddToLibrary] = useState(false);

  const indexPatterns = [
    { id: '1', title: 'sample_ecom' },
    { id: '2', title: 'other' },
  ];

  const onChange = (newId: string) => {
    console.log('hello');

    const newIndexPattern = indexPatterns.find((ip) => ip.id === newId);

    setIndexPattern(newIndexPattern);
  };

  const triggerLabel = indexPattern?.title || 'Choose Index Pattern';

  return (
    <IndexPatternPicker
      trigger={{ label: triggerLabel, title: triggerLabel }}
      indexPatternRefs={indexPatterns}
      indexPatternId={indexPattern?.id}
      onChangeIndexPattern={onChange}
    />
  );
}
