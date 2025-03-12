/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const BASE_ALERTING_API_PATH = '/api/alerting';

export const queryKeys = {
  root: 'rules',
  tags: ({
    ruleTypeIds,
    search,
    perPage,
    page,
    refresh,
  }: {
    ruleTypeIds?: string[];
    search?: string;
    perPage?: number;
    page: number;
    refresh?: Date;
  }) =>
    [
      queryKeys.root,
      'tags',
      ruleTypeIds,
      search,
      perPage,
      page,
      {
        refresh: refresh?.toISOString(),
      },
    ] as const,
};

export const mutationKeys = {
  root: 'rules',
};
