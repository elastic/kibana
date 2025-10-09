/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import type { RouteComponentProps } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { ScopedHistory } from '@kbn/core-application-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WorkflowDetailPage } from './pages/workflow_detail';
import { WorkflowsPage } from './pages/workflows';
import { AccessDenied } from '../common/components/access_denied';
import { WorkflowEditorStoreProvider } from './widgets/workflow_yaml_editor/lib/store/provider';

interface WorkflowsAppDeps {
  history: ScopedHistory;
}
export const WorkflowsRoutes = React.memo<WorkflowsAppDeps>(({ history }) => (
  <Router history={history}>
    <I18nProvider>
      <Routes>
        <Route path="/:id" component={WorkflowDetailPageRoute} />
        <Route path="/" exact component={WorkflowsListPageRoute} />
      </Routes>
    </I18nProvider>
  </Router>
));

type WorkflowDetailPageRouteProps = RouteComponentProps<{ id: string }>;
const WorkflowDetailPageRoute = React.memo<WorkflowDetailPageRouteProps>((props) => {
  return (
    <WorkflowsPermissionsWrapper permissions={['read', 'readWorkflow']}>
      <WorkflowEditorStoreProvider>
        <WorkflowDetailPage id={props.match.params.id} />
      </WorkflowEditorStoreProvider>
    </WorkflowsPermissionsWrapper>
  );
});

const WorkflowsListPageRoute = React.memo(() => {
  return (
    <WorkflowsPermissionsWrapper permissions={['read', 'readWorkflow']}>
      <WorkflowsPage />
    </WorkflowsPermissionsWrapper>
  );
});

type WorkflowsPermissionsWrapperParams = React.PropsWithChildren<{
  permissions: string[];
}>;
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
