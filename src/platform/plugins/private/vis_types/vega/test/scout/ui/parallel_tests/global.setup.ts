/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';

export const VEGA_TEST_INDEX = 'vega-test-index';

globalSetupHook('Enable the Vega API feature flag', async ({ apiServices }) => {
  await apiServices.core.settings({
    'feature_flags.overrides': { 'vega.apiEnabled': true },
  });
});

globalSetupHook('Setup Vega tests data', async ({ esClient }) => {
  const exists = await esClient.indices.exists({ index: VEGA_TEST_INDEX });
  if (!exists) {
    await esClient.indices.create({ index: VEGA_TEST_INDEX });
    await esClient.index({ index: VEGA_TEST_INDEX, document: { value: 1 }, refresh: true });
  }
});
