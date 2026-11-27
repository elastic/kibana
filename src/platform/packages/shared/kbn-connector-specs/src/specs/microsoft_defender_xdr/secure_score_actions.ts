/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDefinition } from '../../connector_spec';
import { graphRequest } from './client';
import { ListSecureScoresInputSchema } from './types';
import type { ListSecureScoresInput } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const secureScoreActions: Record<string, ActionDefinition<any, any, any>> = {
  listSecureScores: {
    isTool: true,
    scope: 'read',
    description:
      'Retrieve Microsoft Secure Score snapshots from the Graph Security API. ' +
      "Returns the organization's composite identity, device, and app security score with control-level breakdowns. " +
      'Results are ordered by date descending so the most recent score is first. ' +
      'Requires the SecurityEvents.Read.All Graph permission.',
    input: ListSecureScoresInputSchema,
    handler: async (ctx, input: ListSecureScoresInput) => {
      const data = await graphRequest(ctx, 'get', '/security/secureScores', 'listSecureScores', {
        params: { $top: input.top },
      });
      return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
    },
  },
};
