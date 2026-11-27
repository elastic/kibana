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
import {
  buildFilter,
  checkNextLink,
  filterHeader,
  normaliseLink,
  pageUrl,
  vendorRequest,
} from './client';
import { ENDPOINT_FILTER_MAX, ENDPOINT_TOP_MAX, OAT_TOP_MAX } from './constants';
import { ACTION_DESCRIPTIONS } from './descriptions';
import type { ListEndpointsInput, ListOatInput } from './types';
import { ListEndpointsInputSchema, ListOatInputSchema } from './types';

export interface PageResult {
  totalCount: number | null;
  count: number;
  items: unknown[];
  nextLink: string | null;
}

/**
 * Reads one page: the first one from params, or the caller's checked nextLink with the same filter.
 * A nextLink that asks for a page size above maxTop is refused; a returned nextLink equal to the
 * link that was read is not handed back (the caller would read the same page again).
 */
export const readOnePage = async (
  ctx: ActionContext,
  action: string,
  path: string,
  params: Params,
  filter: string | undefined,
  nextLink: string | undefined,
  maxTop?: number
): Promise<PageResult> => {
  const url = nextLink ? checkNextLink(ctx, nextLink, path, maxTop) : undefined;
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
  const returned = data?.nextLink ?? null;
  const repeated =
    returned !== null &&
    normaliseLink(ctx, returned) === normaliseLink(ctx, url ?? pageUrl(ctx, path, params));
  return {
    totalCount: data?.totalCount ?? null,
    count: data?.count ?? items.length,
    // Before the items: a long page is cut for an agent, so the cursor has to come first.
    nextLink: repeated ? null : returned,
    items,
  };
};

/** Keeps only the named top-level fields of a detection; the projection happens here, the product has none. */
const pickFields = (item: unknown, keep: ReadonlySet<string>): unknown =>
  item !== null && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).filter(([key]) => keep.has(key)))
    : item;

export const listActions: ConnectorSpec['actions'] = {
  listObservedAttackTechniques: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.listObservedAttackTechniques,
    input: ListOatInputSchema,
    handler: async (ctx, input: ListOatInput) => {
      const page = await readOnePage(
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
        input.nextLink,
        OAT_TOP_MAX
      );
      const keep = input.fields ? new Set<string>(input.fields) : undefined;
      return keep ? { ...page, items: page.items.map((item) => pickFields(item, keep)) } : page;
    },
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
        input.nextLink,
        ENDPOINT_TOP_MAX
      );
    },
  },
};
