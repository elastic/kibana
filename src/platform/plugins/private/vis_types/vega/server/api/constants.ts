/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Used in response body `id` fields (create, read, update). */
export const VEGA_LIBRARY_ITEM_ID_DESCRIPTION =
  'The unique ID of the Vega library item, as returned by the create or search endpoints.';

/** Used in request params `id` fields (read, update, delete). */
export const VEGA_LIBRARY_ITEM_PARAMS_ID_DESCRIPTION =
  'The Vega library item ID, as returned by the create or search endpoints, or the ID you chose when you created the item with the upsert endpoint.';

export const commonRouteConfig = {
  access: 'public',
  options: {
    tags: ['oas-tag:Vega'],
    availability: {
      stability: 'stable',
      since: '9.7.0',
    },
  },
  security: {
    authz: {
      enabled: false,
      reason: 'Relies on Saved Objects Client for authorization',
    },
  },
} as const;
