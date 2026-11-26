/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hashedItemStore as packageHashedItemStore } from '@kbn/kibana-utils-browser';
import {
  createStateContainer,
  createStateContainerReactHelpers,
  hashedItemStore as pluginHashedItemStore,
} from '.';

test('exports store methods', () => {
  expect(typeof createStateContainer).toBe('function');
  expect(typeof createStateContainerReactHelpers).toBe('function');
});

test('re-exports the package hashed item store singleton', () => {
  expect(pluginHashedItemStore).toBe(packageHashedItemStore);
});
