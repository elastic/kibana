/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_UIAM_PROJECT_TYPES } from './constants';

/**
 * The built-in UIAM role that every member of an organization holds. It grants no application
 * roles of its own, but it is what grants organization-level actions such as creating a
 * project-scoped service account.
 */
export const MOCK_IDP_UIAM_ORGANIZATION_ROLE_ID = 'ess-default-organization';

/**
 * The built-in UIAM project role that grants exactly the application roles listed on the
 * assignment and nothing else. It suits the mock IdP, which takes arbitrary role names. UIAM
 * rewrites project roles to this form itself when it resolves application roles.
 */
export const getMockIdpUiamProjectRoleId = (projectType: string) =>
  `${projectType}-application-only`;

export interface MockIdpUiamOrganizationRoleAssignment {
  role_id: string;
  organization_id: string;
  application_roles: string[];
}

export interface MockIdpUiamProjectRoleAssignment {
  role_id: string;
  organization_id: string;
  project_type: string;
  application_roles: string[];
  project_scope: { scope: 'all' };
}

/**
 * Builds the UIAM role assignments of a mock IdP user. The same assignments go into the access
 * token and into the user document seeded in Cosmos DB, so the two cannot disagree.
 *
 * Every role ID must be one UIAM knows. UIAM ignores an unknown role, so a made-up ID still
 * parses but grants nothing, and the user is refused any organization action with `0x93B121`
 * (`AUTHZ_DENY`).
 */
export function buildMockIdpUiamRoleAssignments({
  organizationId,
  projectType,
  applicationRoles,
}: {
  organizationId: string;
  projectType: string;
  applicationRoles: string[];
}): {
  organization: MockIdpUiamOrganizationRoleAssignment[];
  project: MockIdpUiamProjectRoleAssignment[];
} {
  return {
    organization: [
      {
        role_id: MOCK_IDP_UIAM_ORGANIZATION_ROLE_ID,
        organization_id: organizationId,
        // Explicitly empty: when this is unset, UIAM may fill in default application roles for
        // an organization role, and this assignment must not widen the user's roles.
        application_roles: [],
      },
    ],
    // One grant per project type, like an org admin with mixed projects. This lets the user
    // reach cross-project (CPS) linked projects of any type, not just the type of the Kibana
    // instance they logged in to.
    project: [...new Set([projectType, ...MOCK_IDP_UIAM_PROJECT_TYPES])].map(
      (grantedProjectType) => ({
        role_id: getMockIdpUiamProjectRoleId(grantedProjectType),
        organization_id: organizationId,
        project_type: grantedProjectType,
        application_roles: applicationRoles,
        project_scope: { scope: 'all' as const },
      })
    ),
  };
}
