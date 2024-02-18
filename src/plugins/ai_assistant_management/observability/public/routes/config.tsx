/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import * as t from 'io-ts';
import { createRouter } from '@kbn/typed-react-router-config';
import { SettingsPage } from './components/settings_page';

const Tabs = t.union([
  t.literal('settings'),
  t.literal('knowledge_base'),
  t.literal('search_connector'),
  t.undefined,
]);
export type TabsRt = t.TypeOf<typeof Tabs>;

const aIAssistantManagementObservabilityRoutes = {
  '/': {
    element: <SettingsPage />,
    params: t.type({
      query: t.partial({
        tab: Tabs,
      }),
    }),
  },
};

export type AIAssistantManagementObservabilityRoutes =
  typeof aIAssistantManagementObservabilityRoutes;

export const aIAssistantManagementObservabilityRouter = createRouter(
  aIAssistantManagementObservabilityRoutes
);

export type AIAssistantManagementObservabilityRouter =
  typeof aIAssistantManagementObservabilityRouter;
