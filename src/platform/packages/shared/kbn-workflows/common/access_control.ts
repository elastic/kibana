/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACCESS_CONTROL_MAX_ENTRIES,
  createAccessControlSchema,
  hasEntityAccess,
} from '@kbn/entity-access-control';
import type { AccessControl } from '@kbn/entity-access-control';
import { z } from '@kbn/zod/v4';

export const WORKFLOW_ACCESS_CONTROL_ROLES = ['viewer', 'executor', 'editor'] as const;
export type WorkflowAccessControlRole = (typeof WORKFLOW_ACCESS_CONTROL_ROLES)[number];
export type WorkflowAccessControl = AccessControl<WorkflowAccessControlRole>;
export const workflowAccessControlSchema = createAccessControlSchema(WORKFLOW_ACCESS_CONTROL_ROLES);
export const storedWorkflowAccessControlSchema = workflowAccessControlSchema
  .extend({
    entries: workflowAccessControlSchema.shape.entries
      .unwrap()
      .element.extend({ added_at: z.string() })
      .array()
      .max(ACCESS_CONTROL_MAX_ENTRIES),
  })
  .optional();
export type WorkflowAccessOperation = 'read' | 'execute' | 'edit' | 'manage';
export type WorkflowPermissions = Record<WorkflowAccessOperation, boolean>;

export interface WorkflowAccessSubject {
  access_control?: WorkflowAccessControl;
  owner_id?: string;
}

/** Resolves workflow ACL permissions independently of feature privileges. */
export const getWorkflowPermissions = (
  workflow: WorkflowAccessSubject,
  profileId: string | undefined
): WorkflowPermissions => {
  const { access_control: accessControl, owner_id: ownerId } = workflow;
  if (!accessControl || accessControl.access_mode === 'public') {
    return {
      read: true,
      execute: true,
      edit: true,
      manage: Boolean(profileId && profileId === ownerId),
    };
  }
  const can = (roles: readonly WorkflowAccessControlRole[]) =>
    hasEntityAccess({ accessControl, ownerId, profileId, roles });
  return {
    read: can(WORKFLOW_ACCESS_CONTROL_ROLES),
    execute: can(['executor', 'editor']),
    edit: can(['editor']),
    manage: can([]),
  };
};
