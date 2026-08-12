/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfile } from '@kbn/core-user-profile-common';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';

import { mapWorkflowHistoryItem } from './map_workflow_history_item';
import { WorkflowChangeHistoryDisabledError } from './workflow_change_history_disabled_error';
import {
  ES_MAX_RESULT_WINDOW,
  WorkflowHistoryPaginationError,
} from './workflow_history_pagination_error';
import type { WorkflowChangesHistoryResponse } from '../../common/lib/workflow_change_history/types';
import type { IWorkflowChangeHistoryService } from '../services/workflow_change_history_types';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

export interface GetWorkflowChangeHistoryDeps {
  changeHistoryService: IWorkflowChangeHistoryService;
  userProfileService: UserProfileServiceStart;
  getWorkflowSource: (id: string, spaceId: string) => Promise<{ spaceId: string } | null>;
}

export interface GetHistoryForWorkflowParams {
  workflowId: string;
  spaceId: string;
  page?: number;
  perPage?: number;
}

export const assertWorkflowChangeHistoryEnabled = (
  changeHistoryService: IWorkflowChangeHistoryService
): void => {
  if (!changeHistoryService.isInitialized()) {
    throw new WorkflowChangeHistoryDisabledError();
  }
};

export const assertWorkflowHistoryPaginationWithinWindow = (
  page: number,
  perPage: number
): void => {
  const from = (page - 1) * perPage;
  if (from + perPage > ES_MAX_RESULT_WINDOW) {
    throw new WorkflowHistoryPaginationError();
  }
};

export const getHistoryForWorkflow = async (
  deps: GetWorkflowChangeHistoryDeps,
  {
    workflowId,
    spaceId,
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PER_PAGE,
  }: GetHistoryForWorkflowParams
): Promise<WorkflowChangesHistoryResponse> => {
  assertWorkflowChangeHistoryEnabled(deps.changeHistoryService);
  assertWorkflowHistoryPaginationWithinWindow(page, perPage);

  const workflow = await deps.getWorkflowSource(workflowId, spaceId);
  if (!workflow) {
    throw new WorkflowNotFoundError(workflowId);
  }

  const historySpaceId =
    workflow.spaceId === GLOBAL_WORKFLOW_SPACE_ID ? GLOBAL_WORKFLOW_SPACE_ID : spaceId;

  const result = await deps.changeHistoryService.getHistory(historySpaceId, workflowId, {
    from: (page - 1) * perPage,
    size: perPage,
  });

  const userProfilesById = await resolveUserProfiles(deps.userProfileService, result.items);

  return {
    page,
    perPage,
    total: result.total,
    items: result.items.map((item) => mapWorkflowHistoryItem(item, userProfilesById)),
  };
};

const resolveUserProfiles = async (
  userProfileService: UserProfileServiceStart,
  items: Array<{ user?: { id?: string } }>
): Promise<Map<string, UserProfile>> => {
  const uids = new Set(items.flatMap((item) => (item.user?.id ? [item.user.id] : [])));

  if (uids.size === 0) {
    return new Map();
  }

  const profiles = await userProfileService.bulkGet({ uids });

  return new Map(profiles.map((profile) => [profile.uid, profile]));
};
