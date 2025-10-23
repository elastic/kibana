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
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { WorkflowDetailPage } from './pages/workflow_detail';
import { WorkflowsPage } from './pages/workflows';
import { WorkflowEditorStoreProvider } from './widgets/workflow_yaml_editor/lib/store/provider';
import { AccessDenied } from '../common/components/access_denied';

type WorkflowsPermissionsWrapperParams = React.PropsWithChildren<{
  permissions: string[];
}>;
/** Wrapper component to check if the user has the required permissions to access the workflows management page */
const WorkflowsPermissionsWrapper = React.memo<WorkflowsPermissionsWrapperParams>(
  ({ permissions, children }) => {
    const { services } = useKibana();
    const capabilities = services.application?.capabilities?.workflowsManagement;

    let havePermissions = false;
    if (capabilities) {
      havePermissions = permissions.some((permission) => !!capabilities[permission]);
    }

    if (!havePermissions) {
      return <AccessDenied requirements={permissions} />;
    }

    return children;
  }
);
WorkflowsPermissionsWrapper.displayName = 'WorkflowsPermissionsWrapper';

/** Route component to display the workflow detail page to edit or create a workflow */
type WorkflowDetailPageRouteProps = RouteComponentProps<{ id?: string }>;
const WorkflowDetailPageRoute = React.memo<WorkflowDetailPageRouteProps>((props) => {
  return (
    <WorkflowsPermissionsWrapper permissions={['read', 'readWorkflow']}>
      <WorkflowEditorStoreProvider>
        <WorkflowDetailPage id={props.match.params.id} />
      </WorkflowEditorStoreProvider>
    </WorkflowsPermissionsWrapper>
  );
});
WorkflowDetailPageRoute.displayName = 'WorkflowDetailPageRoute';

/** Route component to display the workflows list page */
const WorkflowsListPageRoute = React.memo(() => {
  return (
    <WorkflowsPermissionsWrapper permissions={['read', 'readWorkflow']}>
      <WorkflowsPage />
    </WorkflowsPermissionsWrapper>
  );
});
WorkflowsListPageRoute.displayName = 'WorkflowsListPageRoute';

// The exported router component
interface WorkflowsAppDeps {
  history: ScopedHistory;
}
export const WorkflowsRoutes = React.memo<WorkflowsAppDeps>(({ history }) => (
  <Router history={history}>
    <I18nProvider>
      <Routes>
        <Route path={['/create', '/:id']} component={WorkflowDetailPageRoute} />
        <Route path="/" exact component={WorkflowsListPageRoute} />
      </Routes>
    </I18nProvider>
  </Router>
));
WorkflowsRoutes.displayName = 'WorkflowsRoutes';
