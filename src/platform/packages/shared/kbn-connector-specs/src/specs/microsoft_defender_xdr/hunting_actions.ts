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
import { RunHuntingQueryInputSchema } from './types';
import type { RunHuntingQueryInput } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const huntingActions: Record<string, ActionDefinition<any, any, any>> = {
  runHuntingQuery: {
    isTool: true,
    scope: 'read',
    description:
      'Run a Kusto Query Language (KQL) advanced hunting query against Microsoft Defender XDR ' +
      'tables (DeviceEvents, EmailEvents, AlertInfo, AlertEvidence, IdentityLogonEvents, CloudAppEvents, etc.). ' +
      'Returns schema and result rows. Results are capped at 100,000 rows; queries can access up to 30 days of data. ' +
      'Always project only the columns you need (e.g. | project DeviceId, Timestamp, ActionType) and add a take ' +
      'limit (e.g. | take 100) to avoid exceeding the Kibana response-size limit.',
    input: RunHuntingQueryInputSchema,
    handler: async (ctx, input: RunHuntingQueryInput) => {
      const body: Record<string, unknown> = { Query: input.query };
      if (input.timespan) body.Timespan = input.timespan;
      const data = await graphRequest(ctx, 'post', '/security/runHuntingQuery', 'runHuntingQuery', {
        body,
      });
      return {
        schema: data?.schema ?? [],
        results: data?.results ?? [],
        stats: data?.stats ?? null,
      };
    },
  },
};
