/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LinksState } from '../../server';
import { coreServices } from '../services/kibana_services';
import type { LinksSanitizeResponseBody } from './types';

export async function sanitizeLinks(state: LinksState) {
  const result = await coreServices.http.post<LinksSanitizeResponseBody>(`/api/links/_sanitize`, {
    version: '1',
    body: JSON.stringify(state),
  });

  return {
    data: result.data,
    warnings: result.warnings ?? [],
  };
}
