/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRouter } from '@kbn/typed-react-router-config';
import { AiAssistantSelectionPage } from './components/ai_assistant_selection_page';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const aIAssistantManagementSelectionRoutes = {
  '/': {
    element: <AiAssistantSelectionPage />,
  },
};

export type AIAssistantManagementSelectionRoutes = typeof aIAssistantManagementSelectionRoutes;

export const aIAssistantManagementSelectionRouter = createRouter(
  aIAssistantManagementSelectionRoutes
);

export type AIAssistantManagementSelectionRouter = typeof aIAssistantManagementSelectionRouter;
