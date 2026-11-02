/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';

import { WorkflowsManagementFeatureConfig } from './features';

const getSubFeaturePrivilege = (id: string) =>
  WorkflowsManagementFeatureConfig.subFeatures!.flatMap((subFeature) =>
    subFeature.privilegeGroups.flatMap((group) => group.privileges)
  ).find((privilege) => privilege?.id === id);

describe('WorkflowsManagementFeatureConfig', () => {
  it('grants ai_index read on workflow via the workflow_read sub-feature privilege', () => {
    const subPrivilege = getSubFeaturePrivilege('workflow_read')!;

    expect(subPrivilege.aiIndex).toEqual({ read: [WORKFLOW_KI_TYPE] });
    expect(subPrivilege.includeIn).toBe('read');
  });

  it('does not grant ai_index read on the top-level privileges directly', () => {
    // All workflow-specific actions are managed by sub-feature privileges; the grant reaches the
    // primary `read`/`all` privileges through the sub-feature merging in feature_privilege_iterator.
    expect(WorkflowsManagementFeatureConfig.privileges!.all.aiIndex).toBeUndefined();
    expect(WorkflowsManagementFeatureConfig.privileges!.read.aiIndex).toBeUndefined();
  });

  it('does not grant ai_index read via the managed-workflows privilege', () => {
    // The workflow KI type gates every entry on `api:read`, so widening to `readManaged` would let a
    // user who only has managed-workflow access see unmanaged workflows in the catalogue.
    const subPrivilege = getSubFeaturePrivilege('workflow_read_managed')!;

    expect(subPrivilege.aiIndex).toBeUndefined();
  });
});
