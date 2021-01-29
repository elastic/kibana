/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { deepFreeze } from '@kbn/std';

export const DEFAULT_HEADERS = deepFreeze({
  // Elasticsearch uses this to identify when a request is coming from Kibana, to allow Kibana to
  // access system indices using the standard ES APIs without logging a warning. After migrating to
  // use the new system index APIs, this header can be removed.
  'x-elastic-product-origin': 'kibana',
});
