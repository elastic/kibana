/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dimensionsApi } from './api/dimensions';
import { metricDataApi } from './api/data';
import { fieldsApi } from './api/fields';

export const routeRepository = {
  ...dimensionsApi,
  ...metricDataApi, // TODO: Remove once we integrate with Lens for the charts
  ...fieldsApi,
};
