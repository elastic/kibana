/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type { ListPage, Params } from './client';
import { buildFilter, checkNextLink, filterHeader, vendorRequest } from './client';
import { ENDPOINT_FILTER_MAX } from './constants';
import { ACTION_DESCRIPTIONS } from './descriptions';
import type { ListEndpointsInput, ListOatInput } from './types';
import { ListEndpointsInputSchema, ListOatInputSchema } from './types';

export interface PageResult {
  totalCount: number | null;
  count: number;
  items: unknown[];
  nextLink: string | null;
}

/** Reads one page: the first one from params, or the caller's checked nextLink with the same filter. */
export const readOnePage = async (
  ctx: ActionContext,
  action: string,
  path: string,
  params: Params,
  filter: string | undefined,
  nextLink: string | undefined
): Promise<PageResult> => {
  const url = nextLink ? checkNextLink(ctx, nextLink, path) : undefined;
  const { data } = await vendorRequest<ListPage>(ctx, {
    action,
    method: 'GET',
    path,
    url,
    params,
    headers: filterHeader(filter),
    mutating: false,
  });
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    totalCount: data?.totalCount ?? null,
    count: data?.count ?? items.length,
    items,
    nextLink: data?.nextLink ?? null,
  };
};

export const listActions: ConnectorSpec['actions'] = {
  listObservedAttackTechniques: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.listObservedAttackTechniques,
    input: ListOatInputSchema,
    handler: async (ctx, input: ListOatInput) =>
      readOnePage(
        ctx,
        'listObservedAttackTechniques',
        '/oat/detections',
        {
          detectedStartDateTime: input.detectedStartDateTime,
          detectedEndDateTime: input.detectedEndDateTime,
          ingestedStartDateTime: input.ingestedStartDateTime,
          ingestedEndDateTime: input.ingestedEndDateTime,
          top: input.top,
        },
        input.filter?.trim() || undefined,
        input.nextLink
      ),
  },

  listEndpoints: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.listEndpoints,
    input: ListEndpointsInputSchema,
    handler: async (ctx, input: ListEndpointsInput) => {
      const filter = buildFilter(
        [
          ['agentGuid', input.agentGuid],
          ['endpointName', input.endpointName],
        ],
        input.filter
      );
      if (filter && filter.length > ENDPOINT_FILTER_MAX) {
        throw new Error(
          `The combined endpoint filter is ${filter.length} characters; the product accepts at most ${ENDPOINT_FILTER_MAX}`
        );
      }
      return readOnePage(
        ctx,
        'listEndpoints',
        '/endpointSecurity/endpoints',
        { top: input.top, select: input.select?.join(','), orderBy: input.orderBy },
        filter,
        input.nextLink
      );
    },
  },
};
