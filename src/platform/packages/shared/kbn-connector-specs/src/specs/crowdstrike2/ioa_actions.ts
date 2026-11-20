/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { MAX_URL_BYTES, SCOPES } from './constants';
import {
  chunkIdsByUrlBytes,
  errorsOf,
  falconRequest,
  fetchDetails,
  names,
  offsetPage,
  paginationTotal,
  resourcesOf,
  serializeParams,
} from './client';
import type { FalconBody } from './client';
import type { ItemOutcome } from './format';
import type {
  CreateIOARuleInput,
  DeleteIOARuleInput,
  ListIOARulesInput,
  SearchIOAExclusionsInput,
  UpdateIOARuleInput,
} from './types';
import {
  CreateIOARuleInputSchema,
  DeleteIOARuleInputSchema,
  ListIOARulesInputSchema,
  SearchIOAExclusionsInputSchema,
  UpdateIOARuleInputSchema,
} from './types';

/** Room for the base URL and path of a request whose query also carries ids. */
const URL_BASE_RESERVE_BYTES = 500;

/** The current version of a custom IOA rule group, for the optimistic lock of a rule update. */
const ruleGroupVersion = async (ctx: ActionContext, ruleGroupId: string): Promise<number> => {
  const response = await falconRequest(ctx, {
    method: 'GET',
    path: '/ioarules/entities/rule-groups/v1',
    params: { ids: [ruleGroupId] },
    retryServerErrors: true,
    scope: SCOPES.ioaRulesRead,
  });
  const version = resourcesOf<{ version?: unknown }>(response.data)[0]?.version;
  if (typeof version !== 'number') {
    throw new Error(
      `Could not read the version of custom IOA rule group ${ruleGroupId}: Falcon returned no rule group. Check the rule_group_id or pass rulegroup_version.`
    );
  }
  return version;
};

/** Fields of a rule update: only the fields given. */
const ruleChanges = (input: UpdateIOARuleInput) => {
  const changes: Record<string, unknown> = {};
  if (input.enabled !== undefined) changes.enabled = input.enabled;
  if (input.name !== undefined) changes.name = input.name;
  if (input.description !== undefined) changes.description = input.description;
  if (input.pattern_severity !== undefined) changes.pattern_severity = input.pattern_severity;
  if (input.disposition_id !== undefined) changes.disposition_id = input.disposition_id;
  if (input.field_values !== undefined) changes.field_values = input.field_values;
  return changes;
};

export const ioaActions: ConnectorSpec['actions'] = {
  listIOARules: {
    isTool: true,
    scope: 'read',
    description:
      'List custom IOA rule groups with their rules by FQL filter, free text and sort. A rule is identified by its instance_id. Returns one page and next_offset.',
    input: ListIOARulesInputSchema,
    handler: async (ctx, input: ListIOARulesInput) => {
      const page = await offsetPage(ctx, {
        path: '/ioarules/queries/rule-groups-full/v1',
        params: {
          filter: input.filter,
          q: input.q,
          sort: input.sort,
          offset: input.offset === undefined ? undefined : String(input.offset),
          limit: input.limit ?? 50,
        },
        scope: SCOPES.ioaRulesRead,
      });
      return {
        rule_groups: page.resources,
        total: paginationTotal(page, page.resources.length),
        next_offset: page.next_offset,
        errors: page.errors,
        meta: page.meta,
      };
    },
  },
  createIOARule: {
    isTool: false,
    scope: 'write',
    description:
      'Create a custom IOA rule in a rule group. Falcon creates it disabled. Returns the rule with its instance_id.',
    input: CreateIOARuleInputSchema,
    handler: async (ctx, input: CreateIOARuleInput) => {
      const response = await falconRequest(ctx, {
        method: 'POST',
        path: '/ioarules/entities/rules/v1',
        data: {
          rulegroup_id: input.rule_group_id,
          ruletype_id: input.ruletype_id,
          name: input.name,
          description: input.description ?? '',
          pattern_severity: input.pattern_severity,
          disposition_id: input.disposition_id,
          field_values: input.field_values,
          comment: input.comment ?? '',
        },
        retryServerErrors: false,
        scope: SCOPES.ioaRulesWrite,
      });
      return {
        rule: resourcesOf(response.data)[0] ?? null,
        errors: errorsOf(response.data),
        meta: response.data?.meta,
      };
    },
  },
  updateIOARule: {
    isTool: false,
    scope: 'destroy',
    description:
      'Update one custom IOA rule, for example enable or disable it. Only the given fields change. Returns the updated rule group.',
    input: UpdateIOARuleInputSchema,
    handler: async (ctx, input: UpdateIOARuleInput) => {
      const version = input.rulegroup_version ?? (await ruleGroupVersion(ctx, input.rule_group_id));
      const response = await falconRequest(ctx, {
        method: 'PATCH',
        path: '/ioarules/entities/rules/v2',
        data: {
          rulegroup_id: input.rule_group_id,
          rulegroup_version: version,
          comment: input.comment ?? '',
          rule_updates: [
            { instance_id: input.instance_id, rulegroup_version: version, ...ruleChanges(input) },
          ],
        },
        retryServerErrors: false,
        scope: SCOPES.ioaRulesWrite,
      });
      return {
        rules: resourcesOf(response.data),
        errors: errorsOf(response.data),
        meta: response.data?.meta,
      };
    },
  },
  deleteIOARule: {
    isTool: false,
    scope: 'destroy',
    description:
      'Delete custom IOA rules of one rule group by instance_id. Returns outcomes per id: requested or notFound.',
    input: DeleteIOARuleInputSchema,
    handler: async (ctx, input: DeleteIOARuleInput) => {
      const fixed = serializeParams({ rule_group_id: input.rule_group_id, comment: input.comment });
      const budget = MAX_URL_BYTES - URL_BASE_RESERVE_BYTES - fixed.length;
      const ruleIds = [...new Set(input.rule_ids)];
      const failures: Array<{ id?: string; code?: number; message?: string }> = [];
      let meta: FalconBody['meta'];
      const sent: string[] = [];
      for (const chunk of chunkIdsByUrlBytes(ruleIds, budget)) {
        let response;
        try {
          response = await falconRequest(ctx, {
            method: 'DELETE',
            path: '/ioarules/entities/rules/v1',
            params: { rule_group_id: input.rule_group_id, ids: chunk, comment: input.comment },
            retryServerErrors: false,
            scope: SCOPES.ioaRulesWrite,
          });
        } catch (error) {
          // Nothing deleted yet: report the error as it is.
          if (sent.length === 0) throw error;
          // Earlier chunks are already deleted: stop, keep them in ids and report every id
          // not sent successfully as a failure, so the caller knows which rules are gone.
          const message = error instanceof Error ? error.message : String(error);
          failures.push(
            ...ruleIds
              .filter((id) => !sent.includes(id))
              .map((id) => ({ id, message: `Not deleted: ${message}` }))
          );
          break;
        }
        sent.push(...chunk);
        failures.push(...errorsOf(response.data));
        meta = response.data?.meta;
      }
      const unattributed = failures.some((failure) => !ruleIds.some((id) => names(failure, id)));
      const ids = unattributed
        ? []
        : sent.filter((id) => !failures.some((failure) => names(failure, id)));
      const outcomes = ruleIds.map((id): ItemOutcome => {
        if (ids.includes(id)) {
          return { id, status: 'requested' };
        }
        const failure = failures.find((item) => names(item, id));
        if (failure?.code === 404) {
          return { id, status: 'notFound' };
        }
        return {
          id,
          status: 'failed',
          reason: failure?.message ?? 'Falcon reported an error that names no rule.',
        };
      });
      return { deleted: ids.length > 0, ids, failures, meta, outcomes };
    },
  },
  searchIOAExclusions: {
    isTool: true,
    scope: 'read',
    description:
      'Search IOA exclusions by FQL filter and return their details, or only their ids when hydrate is false.',
    input: SearchIOAExclusionsInputSchema,
    handler: async (ctx, input: SearchIOAExclusionsInput) => {
      const page = await offsetPage(ctx, {
        path: '/exclusions/queries/ss-ioa-exclusions/v2',
        params: {
          filter: input.filter,
          sort: input.sort,
          offset: input.offset,
          limit: input.limit ?? 100,
        },
        scope: SCOPES.ioaExclusionsRead,
      });
      const ids = page.resources.filter((id): id is string => typeof id === 'string');
      const details =
        input.hydrate === false || ids.length === 0
          ? { resources: [], errors: [] }
          : await fetchDetails(
              ctx,
              '/exclusions/entities/ss-ioa-exclusions/v2',
              ids,
              SCOPES.ioaExclusionsRead
            );
      return {
        exclusions: details.resources,
        ids,
        total: paginationTotal(page, ids.length),
        next_offset: page.next_offset,
        errors: [...page.errors, ...details.errors],
        meta: page.meta,
      };
    },
  },
};
