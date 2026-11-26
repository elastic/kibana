/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import type { QueryParams } from './client';
import { s1Request, toListResult } from './client';
import { GetApplicationCvesInputSchema } from './application_risk_types';
import type { GetApplicationCvesInput } from './application_risk_types';
import { ACTION_DESCRIPTIONS } from './descriptions';

export const applicationRiskActions: ConnectorSpec['actions'] = {
  getApplicationCves: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getApplicationCves,
    input: GetApplicationCvesInputSchema,
    handler: async (ctx, input: GetApplicationCvesInput) => {
      // toQuery maps the Gte, Lte and Contains inputs; these three operators are named here
      const { publishedDateGt, publishedDateLt, publishedDateBetween, ...named } = input;
      const operators: QueryParams = Object.fromEntries([
        ['publishedDate__gt', publishedDateGt],
        ['publishedDate__lt', publishedDateLt],
        ['publishedDate__between', publishedDateBetween],
      ]);
      return toListResult(
        await s1Request(ctx, {
          action: 'getApplicationCves',
          method: 'GET',
          path: '/application-management/risks/cves',
          params: { ...named, ...operators },
          mutating: false,
        })
      );
    },
  },
};
