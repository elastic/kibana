/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { input } from './input_slice';
import { output } from './output_slice';

export type { CreateStoreOptions, State } from './create_store';
export { createStore } from './create_store';
export const actions = {
  input: input.actions,
  output: output.actions,
};
