/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';

export interface DeleteCustomLinkResponse {
  result: string;
}

export const deleteCustomLinkRoute = defineRoute<DeleteCustomLinkResponse>()({
  endpoint: 'DELETE /internal/apm/settings/custom_links/{id}',
  params: t.type({
    path: t.type({
      id: t.string,
    }),
  }),
});
