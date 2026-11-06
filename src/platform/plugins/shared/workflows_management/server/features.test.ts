/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';

import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { getWorkflowsManagementFeatureConfig, WorkflowsManagementFeatureConfig } from './features';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './pages/page_saved_object';

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

  describe('workflow pages', () => {
    const getPrivileges = (pagesEnabled: boolean) =>
      getWorkflowsManagementFeatureConfig({ pagesEnabled }).subFeatures!.flatMap((subFeature) =>
        subFeature.privilegeGroups.flatMap((group) => group.privileges)
      );

    it('has no page privilege while pages are off', () => {
      expect(getWorkflowsManagementFeatureConfig({ pagesEnabled: false })).toBe(
        WorkflowsManagementFeatureConfig
      );
      expect(getPrivileges(false).map(({ id }) => id)).not.toContain('workflow_page_manage');
    });

    it('lets page managers write pages without workflow update', () => {
      const pagePrivilege = getPrivileges(true).find(({ id }) => id === 'workflow_page_manage')!;

      expect(pagePrivilege.api).toEqual([WorkflowsManagementApiActions.managePages]);
      expect(pagePrivilege.savedObject).toEqual({
        all: [WORKFLOW_PAGE_SAVED_OBJECT_TYPE],
        read: [],
      });
      expect(pagePrivilege.includeIn).toBe('all');
    });

    it('gives no other privilege access to pages', () => {
      getPrivileges(true)
        .filter(({ id }) => id !== 'workflow_page_manage')
        .forEach(({ savedObject }) => {
          expect([...savedObject.all, ...savedObject.read]).not.toContain(
            WORKFLOW_PAGE_SAVED_OBJECT_TYPE
          );
        });
    });
  });
});
