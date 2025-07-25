/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createRouter } from '@kbn/typed-react-router-config';
import { SpaceAwareRoute } from './components/space_aware_route';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const aIAssistantManagementSelectionRoutes = {
  '/': {
    element: <SpaceAwareRoute />,
  },
};

export type AIAssistantManagementSelectionRoutes = typeof aIAssistantManagementSelectionRoutes;

export const aIAssistantManagementSelectionRouter = createRouter(
  aIAssistantManagementSelectionRoutes
);

export type AIAssistantManagementSelectionRouter = typeof aIAssistantManagementSelectionRouter;
