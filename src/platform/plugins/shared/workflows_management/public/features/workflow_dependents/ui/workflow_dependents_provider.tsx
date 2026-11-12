/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux-v7';
import { WorkflowDependentsFlyout } from './workflow_dependents_flyout';
import { selectWorkflowName } from '../../../entities/workflows/store/workflow_detail/selectors';
import { useBreakingChangeConfirmation } from '../model/use_breaking_change_confirmation';
import { useWorkflowDependents } from '../model/use_workflow_dependents';
import type { WorkflowLinksTab } from '../model/workflow_dependents_context';
import { WorkflowDependentsContext } from '../model/workflow_dependents_context';

/** Shares the connected-workflows analysis, panel and save check across the workflow detail page. */
export const WorkflowDependentsProvider = ({ children }: { children: ReactNode }) => {
  const dependents = useWorkflowDependents();
  const workflowName = useSelector(selectWorkflowName) ?? '';
  const [linksTab, setLinksTab] = useState<WorkflowLinksTab | null>(null);
  const openUsedBy = useCallback(() => setLinksTab('usedBy'), []);
  const { confirmBreakingChange, confirmModal } = useBreakingChangeConfirmation(openUsedBy);

  const value = useMemo(
    () => ({ dependents, openLinks: setLinksTab, confirmBreakingChange }),
    [dependents, confirmBreakingChange]
  );

  return (
    <WorkflowDependentsContext.Provider value={value}>
      {children}
      {confirmModal}
      {linksTab && (
        <WorkflowDependentsFlyout
          workflowName={workflowName}
          analysis={dependents.analysis}
          calledWorkflows={dependents.calledWorkflows}
          hasUnsavedChanges={dependents.hasUnsavedChanges}
          savedYaml={dependents.savedYaml}
          draftYaml={dependents.draftYaml}
          isLoading={dependents.isLoading}
          isError={dependents.isError}
          initialTab={linksTab}
          onRefresh={dependents.refetch}
          onClose={() => setLinksTab(null)}
        />
      )}
    </WorkflowDependentsContext.Provider>
  );
};
