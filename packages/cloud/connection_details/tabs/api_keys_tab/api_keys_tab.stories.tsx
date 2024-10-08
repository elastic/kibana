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
import { ApiKeysTab } from './api_keys_tab';

export default {
  title: 'Connection Details/Tabs/API Keys',
};

export const Default = () => {
  return (
    <StoriesProvider>
      <ApiKeysTab />
    </StoriesProvider>
  );
};
