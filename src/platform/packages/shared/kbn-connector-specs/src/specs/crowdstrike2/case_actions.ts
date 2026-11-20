/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type { ItemOutcome } from './format';
import { SCOPES } from './constants';
import { errorsOf, falconRequest, offsetPage, paginationTotal, resourcesOf } from './client';
import type {
  CaseTagsInput,
  GetCaseDetailsInput,
  SearchCasesInput,
  UpdateCaseInput,
} from './types';
import {
  CaseTagsInputSchema,
  GetCaseDetailsInputSchema,
  SearchCasesInputSchema,
  UpdateCaseInputSchema,
} from './types';

const NUMERIC = /^\d+$/;

/** The PATCH fields of updateCase: only the fields given; a numeric severity is sent as a number. */
export const buildCaseFields = (input: UpdateCaseInput): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  if (input.status !== undefined) fields.status = input.status;
  if (input.assigned_to_user_uuid !== undefined) {
    fields.assigned_to_user_uuid = input.assigned_to_user_uuid;
  }
  if (input.remove_user_assignment !== undefined) {
    fields.remove_user_assignment = input.remove_user_assignment;
  }
  if (input.name !== undefined) fields.name = input.name;
  if (input.description !== undefined) fields.description = input.description;
  if (input.severity !== undefined) {
    fields.severity = NUMERIC.test(input.severity) ? Number(input.severity) : input.severity;
  }
  return fields;
};

const tagResult = (data: Parameters<typeof resourcesOf>[0]) => ({
  resources: resourcesOf(data),
  errors: errorsOf(data),
  meta: data?.meta,
});

interface CaseRecord {
  id?: unknown;
  tags?: unknown;
  consistency?: { consistent?: unknown };
}

/**
 * The case and its tags, read before a tag change. Tags are undefined when the case is not
 * found or Falcon marks the record as not yet consistent (a recent change may be missing), so
 * the caller then sends every tag.
 */
const readCaseTags = async (ctx: ActionContext, caseId: string) => {
  const response = await falconRequest(ctx, {
    method: 'POST',
    path: '/cases/entities/cases/v2',
    data: { ids: [caseId] },
    retryServerErrors: true,
    allowNotFound: true,
    scope: SCOPES.casesRead,
  });
  const record = resourcesOf<CaseRecord>(response.data).find((item) => item?.id === caseId);
  if (!record || record.consistency?.consistent === false) {
    return { record, tags: undefined };
  }
  const tags = Array.isArray(record.tags) ? record.tags : [];
  return { record, tags: new Set(tags.filter((tag): tag is string => typeof tag === 'string')) };
};

/**
 * Add or remove case tags. A tag already in the requested state is skipped; when every tag is,
 * nothing is sent and the case as read is returned.
 */
const changeCaseTags = async (ctx: ActionContext, add: boolean, input: CaseTagsInput) => {
  const { record, tags: current } = await readCaseTags(ctx, input.case_id);
  const inState = (tag: string) => current !== undefined && current.has(tag) === add;
  const send = input.tags.filter((tag) => !inState(tag));
  const outcomes: ItemOutcome[] = input.tags.map((tag) =>
    inState(tag)
      ? { id: tag, status: 'skipped', reason: add ? 'Tag already present.' : 'Tag not present.' }
      : { id: tag, status: 'requested' }
  );
  if (send.length === 0) {
    return { resources: record ? [record] : [], errors: [], meta: undefined, outcomes };
  }
  const response = await falconRequest(
    ctx,
    add
      ? {
          method: 'POST',
          path: '/cases/entities/case-tags/v1',
          data: { id: input.case_id, tags: send },
          retryServerErrors: false,
          scope: SCOPES.casesWrite,
        }
      : {
          method: 'DELETE',
          path: '/cases/entities/case-tags/v1',
          params: { id: input.case_id, tag: send },
          retryServerErrors: false,
          scope: SCOPES.casesWrite,
        }
  );
  return { ...tagResult(response.data), outcomes };
};

/** Falcon Case Management (the successor of the decommissioned incidents API). */
export const caseActions: ConnectorSpec['actions'] = {
  searchCases: {
    isTool: true,
    scope: 'read',
    description:
      'Search Falcon cases by FQL filter, free text and sort. Returns case ids, the total and next_offset.',
    input: SearchCasesInputSchema,
    handler: async (ctx, input: SearchCasesInput) => {
      const page = await offsetPage(ctx, {
        path: '/cases/queries/cases/v1',
        params: {
          filter: input.filter,
          q: input.q,
          sort: input.sort,
          offset: input.offset,
          limit: input.limit ?? 100,
        },
        scope: SCOPES.casesRead,
      });
      const ids = page.resources.filter((id): id is string => typeof id === 'string');
      return {
        ids,
        total: paginationTotal(page, ids.length),
        next_offset: page.next_offset,
        errors: page.errors,
        meta: page.meta,
      };
    },
  },
  getCaseDetails: {
    isTool: true,
    scope: 'read',
    description: 'Get Falcon cases by id. Ids Falcon does not return are listed in missing_ids.',
    input: GetCaseDetailsInputSchema,
    handler: async (ctx, { case_ids: caseIds }: GetCaseDetailsInput) => {
      const response = await falconRequest(ctx, {
        method: 'POST',
        path: '/cases/entities/cases/v2',
        data: { ids: caseIds },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.casesRead,
      });
      const cases = resourcesOf<{ id?: unknown }>(response.data);
      const found = new Set(cases.map((record) => record?.id));
      return {
        cases,
        missing_ids: caseIds.filter((id) => !found.has(id)),
        errors: errorsOf(response.data),
        meta: response.data?.meta,
      };
    },
  },
  updateCase: {
    isTool: true,
    scope: 'destroy',
    description:
      'Update one case: status, assignee (a user UUID), name, description or severity. Cases have no comments; comment on the linked alert with updateAlert.',
    input: UpdateCaseInputSchema,
    handler: async (ctx, input: UpdateCaseInput) => {
      const response = await falconRequest(ctx, {
        method: 'PATCH',
        path: '/cases/entities/cases/v2',
        data: {
          id: input.case_id,
          fields: buildCaseFields(input),
          ...(input.expected_version !== undefined
            ? { expected_version: input.expected_version }
            : {}),
        },
        retryServerErrors: false,
        scope: SCOPES.casesWrite,
      });
      return {
        case: resourcesOf(response.data)[0] ?? null,
        errors: errorsOf(response.data),
        meta: response.data?.meta,
      };
    },
  },
  addCaseTags: {
    isTool: true,
    scope: 'write',
    description:
      'Add tags to one case. Returns outcomes per tag: requested, or skipped when the case already has the tag.',
    input: CaseTagsInputSchema,
    handler: async (ctx, input: CaseTagsInput) => changeCaseTags(ctx, true, input),
  },
  removeCaseTags: {
    isTool: true,
    scope: 'destroy',
    description:
      'Remove tags from one case. Returns outcomes per tag: requested, or skipped when the case does not have the tag.',
    input: CaseTagsInputSchema,
    handler: async (ctx, input: CaseTagsInput) => changeCaseTags(ctx, false, input),
  },
};
