/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { CordProvider } from '@cord-sdk/react';

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardCloudService } from './types';

export type CloudServiceFactory = KibanaPluginServiceFactory<
  DashboardCloudService,
  DashboardStartDependencies
>;

export const cloudServiceFactory: CloudServiceFactory = ({ startPlugins }) => {
  const { cloud, cloudCollaboration } = startPlugins;

  if (!cloud || !cloud.isCloudEnabled) {
    return {
      isCloudEnabled: false,
      CollaborationContextProvider: ({ children }) => <>{children}</>,
      isCollaborationAvailable: false,
      setBreadcrumbPresence: () => {},
      clearBreadcrumbPresence: () => {},
      setPageTitle: () => {},
      clearPageTitle: () => {},
    };
  }

  const noop = () => {};
  const { isCloudEnabled } = cloud;
  const isCollaborationAvailable = cloudCollaboration!.getIsAvailable$().getValue();

  const setBreadcrumbPresence = cloudCollaboration?.setBreadcrumbPresence || noop;
  const clearBreadcrumbPresence = cloudCollaboration?.clearBreadcrumbPresence || noop;
  const setPageTitle = cloudCollaboration?.setPageTitle || noop;
  const clearPageTitle = cloudCollaboration?.clearPageTitle || noop;

  const CollaborationContextProvider: FC = ({ children }) => {
    const token = useObservable(cloudCollaboration!.getToken$());
    return <CordProvider clientAuthToken={token}>{children}</CordProvider>;
  };

  return {
    clearBreadcrumbPresence,
    CollaborationContextProvider,
    isCloudEnabled,
    isCollaborationAvailable,
    setBreadcrumbPresence,
    clearPageTitle,
    setPageTitle,
  };
};
