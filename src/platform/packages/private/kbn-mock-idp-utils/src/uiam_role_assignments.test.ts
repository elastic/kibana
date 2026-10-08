/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildMockIdpUiamRoleAssignments } from './uiam_role_assignments';

// A subset of the built-in roles UIAM defines (`BuiltInRoles` in `uiam-commons`). UIAM ignores an
// unknown role ID instead of rejecting it, so a typo here would only show up as a 403 at runtime.
const KNOWN_UIAM_ROLE_IDS = new Set([
  'ess-default-organization',
  'elasticsearch-application-only',
  'observability-application-only',
  'security-application-only',
  'vectordb-application-only',
]);

describe('buildMockIdpUiamRoleAssignments', () => {
  const organizationId = 'org1234567890';

  it('grants organization membership without application roles', () => {
    const { organization } = buildMockIdpUiamRoleAssignments({
      organizationId,
      projectType: 'security',
      applicationRoles: ['admin'],
    });

    expect(organization).toEqual([
      {
        role_id: 'ess-default-organization',
        organization_id: organizationId,
        application_roles: [],
      },
    ]);
  });

  it('grants the requested application roles on every project type, origin type first', () => {
    const { project } = buildMockIdpUiamRoleAssignments({
      organizationId,
      projectType: 'security',
      applicationRoles: ['viewer', 'editor'],
    });

    expect(project).toEqual(
      ['security', 'elasticsearch', 'observability', 'vectordb'].map(
        (projectType) => ({
          role_id: `${projectType}-application-only`,
          organization_id: organizationId,
          project_type: projectType,
          application_roles: ['viewer', 'editor'],
          project_scope: { scope: 'all' },
        })
      )
    );
  });

  it('only uses role IDs that UIAM defines', () => {
    const { organization, project } = buildMockIdpUiamRoleAssignments({
      organizationId,
      projectType: 'observability',
      applicationRoles: ['admin'],
    });

    for (const { role_id: roleId } of [...organization, ...project]) {
      expect(KNOWN_UIAM_ROLE_IDS).toContain(roleId);
    }
  });
});
