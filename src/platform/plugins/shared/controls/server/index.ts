/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getOptionsListDslSuggestions } from './options_list/get_options_list_dsl_suggestions';
export { optionsListDslFetchBodySchema } from './options_list/options_list_fetch_body_schema';
export type { OptionsListDSLFetchBody, OptionsListResponse } from '../common/options_list/types';

export const plugin = async () => {
  const { ControlsPlugin } = await import('./plugin');
  return new ControlsPlugin();
};
