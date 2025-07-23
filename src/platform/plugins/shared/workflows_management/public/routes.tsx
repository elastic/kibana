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
import { I18nProvider } from '@kbn/i18n-react';
import type { ScopedHistory } from '@kbn/core-application-browser';
import { WorkflowDetailPage } from './pages/workflow_detail';
import { WorkflowsPage } from './pages/workflows';

interface WorkflowsAppDeps {
  history: ScopedHistory;
}

export function WorkflowsRoutes({ history }: WorkflowsAppDeps) {
  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router history={history}>
      <I18nProvider>
        <Routes>
          <Route
            path="/:id"
            render={(props) => <WorkflowDetailPage id={props.match.params.id} />}
          />
          <Route path="/" exact render={() => <WorkflowsPage />} />
        </Routes>
      </I18nProvider>
    </Router>
  );
}
