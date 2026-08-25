/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SelectableEntry } from './toolbar_selector';
import { ToolbarSelector } from './toolbar_selector';

export default {
  title: 'shared-ux/ToolbarSelector',
  component: ToolbarSelector,
};

const options: SelectableEntry[] = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

export const Default = () => (
  <ToolbarSelector
    data-test-subj="toolbarSelectorStory"
    buttonLabel="Select an option"
    options={options}
    searchable={true}
    singleSelection={true}
    onChange={() => {}}
  />
);
