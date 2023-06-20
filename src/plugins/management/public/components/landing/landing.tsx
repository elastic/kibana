/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BasicPage, WithCardNavigationPage } from './pages';
import { useAppContext } from '../management_app/management_context';

interface ManagementLandingPageProps {
  onAppMounted: (id: string) => void;
  setBreadcrumbs: () => void;
}

export const ManagementLandingPage = ({
  setBreadcrumbs,
  onAppMounted,
}: ManagementLandingPageProps) => {
  const { appBasePath, sections, kibanaVersion, showNavigationCards } = useAppContext();

  setBreadcrumbs();

  useEffect(() => {
    onAppMounted('');
  }, [onAppMounted]);

  if (showNavigationCards) {
    return <WithCardNavigationPage appBasePath={appBasePath} sections={sections} />;
  }

  return <BasicPage version={kibanaVersion} />;
};
