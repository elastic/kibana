/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ActionVariable } from '@kbn/alerting-types';

export const REQUIRED_ACTION_VARIABLES = ['params'] as const;
export const CONTEXT_ACTION_VARIABLES = ['context'] as const;
export const OPTIONAL_ACTION_VARIABLES = [...CONTEXT_ACTION_VARIABLES, 'state'] as const;

type AsActionVariables<Keys extends string> = {
  [Req in Keys]: ActionVariable[];
};

export type ActionVariables = AsActionVariables<typeof REQUIRED_ACTION_VARIABLES[number]> &
  Partial<AsActionVariables<typeof OPTIONAL_ACTION_VARIABLES[number]>>;
