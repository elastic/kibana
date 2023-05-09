/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardCloudService } from './types';

type CloudServiceFactory = PluginServiceFactory<DashboardCloudService>;

export const cloudServiceFactory: CloudServiceFactory = () => {
  return {
    CollaborationContextProvider: ({ children }) => <>{children}</>,
    isCloudEnabled: false,
    isCollaborationAvailable: false,
    setBreadcrumbPresence: () => {},
    clearBreadcrumbPresence: () => {},
  };
};
