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
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { WorkflowsAvailabilityWrapper } from './components/workflows_availability';
import { WorkflowsPrivilegesWrapper } from './components/workflows_privileges';
import { WorkflowDetailStoreProvider } from './entities/workflows/store/provider';
import { WorkflowDetailPage } from './pages/workflow_detail';
import { WorkflowsPage } from './pages/workflows';

/** Wraps the workflow detail page in a store provider */
type WorkflowDetailPageRouteProps = RouteComponentProps<{ id?: string }>;
const WorkflowDetailPageRoute = React.memo<WorkflowDetailPageRouteProps>((props) => {
  return (
    <WorkflowDetailStoreProvider>
      <WorkflowDetailPage id={props.match.params.id} />
    </WorkflowDetailStoreProvider>
  );
});
WorkflowDetailPageRoute.displayName = 'WorkflowDetailPageRoute';

interface WorkflowsAppDeps {
  history: ScopedHistory;
}
export const WorkflowsRoutes = React.memo<WorkflowsAppDeps>(({ history }) => (
  <Router history={history}>
    <I18nProvider>
      <WorkflowsAvailabilityWrapper>
        <WorkflowsPrivilegesWrapper>
          <Routes>
            <Route path={['/create', '/:id']} component={WorkflowDetailPageRoute} />
            <Route path="/" exact component={WorkflowsPage} />
          </Routes>
        </WorkflowsPrivilegesWrapper>
      </WorkflowsAvailabilityWrapper>
    </I18nProvider>
  </Router>
));
WorkflowsRoutes.displayName = 'WorkflowsRoutes';
