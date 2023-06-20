/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BasicPage, WithCardNavigationPage } from './pages';
import { ManagementSection } from '../../utils';

interface ManagementLandingPageProps {
  version: string;
  appBasePath: string;
  onAppMounted: (id: string) => void;
  setBreadcrumbs: () => void;
  sections: ManagementSection[];
  showNavigationCards?: boolean;
}

export const ManagementLandingPage = ({
  version,
  sections,
  setBreadcrumbs,
  appBasePath,
  onAppMounted,
  showNavigationCards,
}: ManagementLandingPageProps) => {
  setBreadcrumbs();

  useEffect(() => {
    onAppMounted('');
  }, [onAppMounted]);

  if (showNavigationCards) {
    return <WithCardNavigationPage appBasePath={appBasePath} sections={sections} />;
  }

  return <BasicPage version={version} />;
};
