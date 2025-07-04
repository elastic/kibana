/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmptyState as Component } from './empty_state';

export default {
  component: Component,
  title: 'app/AlertTable',
  argTypes: {
    height: { type: 'select', options: ['short', 'tall'] },
  },
};

export const EmptyState = {
  args: {
    height: 'tall',
  },
};
