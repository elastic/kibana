/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { StoriesProvider } from '../../stories';
import { FancySelect } from './fancy_select';

export default {
  title: 'Connection Details/Components/<FancySelect>',
};

export const Default = () => {
  const [value, setValue] = React.useState<string>('1');

  return (
    <StoriesProvider>
      <FancySelect
        value={value}
        ariaLabel="Choose an option"
        options={[
          { id: '1', title: 'Option 1', description: 'Description 1', icon: 'key' },
          { id: '2', title: 'Option 2', description: 'Description 2', icon: 'search' },
          { id: '3', title: 'Option 3', description: 'Description 3', icon: 'empty' },
        ]}
        onChange={(newValue) => setValue(newValue)}
      />
    </StoriesProvider>
  );
};
