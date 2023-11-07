/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRouter } from '@kbn/typed-react-router-config';
import { SettingsPage } from './components/settings_page';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const aIAssistantManagementObservabilityRoutes = {
  '/': {
    element: <SettingsPage />,
  },
};

export type AIAssistantManagementObservabilityRoutes =
  typeof aIAssistantManagementObservabilityRoutes;

export const aIAssistantManagementObservabilityRouter = createRouter(
  aIAssistantManagementObservabilityRoutes
);

export type AIAssistantManagementObservabilityRouter =
  typeof aIAssistantManagementObservabilityRouter;
