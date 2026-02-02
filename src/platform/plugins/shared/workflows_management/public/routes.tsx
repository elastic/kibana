/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import type { ScopedHistory } from '@kbn/core-application-browser';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { WorkflowDetailStoreProvider } from './entities/workflows/store/provider';
import { useCapabilities } from './hooks/use_capabilities';
import { WorkflowDetailPage } from './pages/workflow_detail';
import { WorkflowsPage } from './pages/workflows';
import { AccessDenied } from '../common/components/access_denied';

const ReadWorkflowPermissionText = i18n.translate(
  'platform.plugins.shared.workflows_management.readWorkflowPermissionText',
  { defaultMessage: 'Workflows: Read' }
);

/** Wrapper component to check if the user has the required permissions to access the workflows management page */
const WorkflowsReadPermissionsWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  const capabilities = useCapabilities();
  if (!capabilities.canReadWorkflow) {
    return <AccessDenied requirements={[ReadWorkflowPermissionText]} />;
  }

  return children;
};
WorkflowsReadPermissionsWrapper.displayName = 'WorkflowsReadPermissionsWrapper';

/** Route component to display the workflow detail page to edit or create a workflow */
type WorkflowDetailPageRouteProps = RouteComponentProps<{ id?: string }>;
const WorkflowDetailPageRoute = React.memo<WorkflowDetailPageRouteProps>((props) => {
  return (
    <WorkflowDetailStoreProvider>
      <WorkflowDetailPage id={props.match.params.id} />
    </WorkflowDetailStoreProvider>
  );
});
WorkflowDetailPageRoute.displayName = 'WorkflowDetailPageRoute';

// The exported router component
interface WorkflowsAppDeps {
  history: ScopedHistory;
}
export const WorkflowsRoutes = React.memo<WorkflowsAppDeps>(({ history }) => (
  <Router history={history}>
    <I18nProvider>
      <WorkflowsReadPermissionsWrapper>
        <Routes>
          <Route path={['/create', '/:id']} component={WorkflowDetailPageRoute} />
          <Route path="/" exact component={WorkflowsPage} />
        </Routes>
      </WorkflowsReadPermissionsWrapper>
    </I18nProvider>
  </Router>
));
WorkflowsRoutes.displayName = 'WorkflowsRoutes';
