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
  resolveEntityAccess,
} from '@kbn/entity-access-control';
import type { AccessControl, EntityAccessDecision } from '@kbn/entity-access-control';
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

const ADMIN_OVERRIDE_OPERATIONS = new Set<WorkflowAccessOperation>(['read', 'manage']);
const operationRoles: Record<WorkflowAccessOperation, readonly WorkflowAccessControlRole[]> = {
  read: WORKFLOW_ACCESS_CONTROL_ROLES,
  execute: ['executor', 'editor'],
  edit: ['editor'],
  manage: [],
};

/** Resolves workflow ACL decisions independently of feature privileges. */
export const getWorkflowAccessDecisions = (
  workflow: WorkflowAccessSubject,
  profileId: string | undefined,
  isAdmin = false
): Record<WorkflowAccessOperation, EntityAccessDecision> => {
  const { access_control: accessControl, owner_id: ownerId } = workflow;
  const can = (operation: WorkflowAccessOperation) =>
    resolveEntityAccess({
      accessControl: accessControl ?? { access_mode: 'public', entries: [] },
      ownerId,
      profileId,
      roles: operationRoles[operation],
      isAdmin: isAdmin && ADMIN_OVERRIDE_OPERATIONS.has(operation),
    });
  if (!accessControl || accessControl.access_mode === 'public') {
    return { read: 'allowed', execute: 'allowed', edit: 'allowed', manage: can('manage') };
  }
  return {
    read: can('read'),
    execute: can('execute'),
    edit: can('edit'),
    manage: can('manage'),
  };
};

/** Resolves workflow ACL permissions independently of feature privileges. */
export const getWorkflowPermissions = (
  workflow: WorkflowAccessSubject,
  profileId: string | undefined,
  isAdmin = false
): WorkflowPermissions =>
  toWorkflowPermissions(getWorkflowAccessDecisions(workflow, profileId, isAdmin));

export const toWorkflowPermissions = (
  decisions: Record<WorkflowAccessOperation, EntityAccessDecision>
): WorkflowPermissions => {
  return {
    read: decisions.read !== 'denied',
    execute: decisions.execute !== 'denied',
    edit: decisions.edit !== 'denied',
    manage: decisions.manage !== 'denied',
  };
};
