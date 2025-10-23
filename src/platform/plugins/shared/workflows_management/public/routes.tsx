/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ScopedHistory } from '@kbn/core-application-browser';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { WorkflowDetailPage } from './pages/workflow_detail';
import { WorkflowsPage } from './pages/workflows';
import { WorkflowEditorStoreProvider } from './widgets/workflow_yaml_editor/lib/store/provider';
import { AccessDenied } from '../common/components/access_denied';

interface WorkflowsAppDeps {
  history: ScopedHistory;
}

interface WorkflowsPermissionsWrapperParams {
  permissions: string[];
  children: React.ReactNode;
}

const WorkflowsPermissionsWrapper = ({
  permissions,
  children,
}: WorkflowsPermissionsWrapperParams) => {
  const { services } = useKibana();
  const capabilities = services.application?.capabilities?.workflowsManagement;

  let havePermissions: boolean;
  if (!capabilities) {
    havePermissions = false;
  } else {
    havePermissions = permissions.some((permission) => {
      return !!capabilities[permission];
    });
  }

  if (!havePermissions) {
    return <AccessDenied requirements={permissions} />;
  }

  return children;
};

export function WorkflowsRoutes({ history }: WorkflowsAppDeps) {
  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router history={history}>
      <I18nProvider>
        <Routes>
          <Route
            path="/:id"
            render={(props) => (
              <WorkflowsPermissionsWrapper permissions={['read', 'readWorkflow']}>
                <WorkflowEditorStoreProvider>
                  <WorkflowDetailPage id={props.match.params.id} />
                </WorkflowEditorStoreProvider>
              </WorkflowsPermissionsWrapper>
            )}
          />
          <Route
            path="/"
            exact
            render={() => (
              <WorkflowsPermissionsWrapper permissions={['read', 'readWorkflow']}>
                <WorkflowsPage />
              </WorkflowsPermissionsWrapper>
            )}
          />
        </Routes>
      </I18nProvider>
    </Router>
  );
}
