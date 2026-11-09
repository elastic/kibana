/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

const HAS_ES_DATA_ROUTE = '**/internal/data_views/has_es_data';

export const mockNoEsData = async (page: ScoutPage): Promise<void> => {
  await page.route(HAS_ES_DATA_ROUTE, (route) => route.fulfill({ json: { hasEsData: false } }));
};

export const unmockNoEsData = async (page: ScoutPage): Promise<void> => {
  await page.unroute(HAS_ES_DATA_ROUTE);
};
