/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { pluginServices } from '../../services/plugin_services';
import { DashboardApi } from '../..';
import { getNewDashboardTitle } from '../_dashboard_app_strings';

export const DashboardTabTitleSetter = ({ dashboardApi }: { dashboardApi: DashboardApi }) => {
  const {
    chrome: { docTitle: chromeDocTitle },
  } = pluginServices.getServices();
  const [title, lastSavedId] = useBatchedPublishingSubjects(
    dashboardApi.panelTitle,
    dashboardApi.savedObjectId
  );

  /**
   * Set chrome tab title when dashboard's title changes
   */
  useEffect(() => {
    chromeDocTitle.change(!lastSavedId ? getNewDashboardTitle() : title ?? lastSavedId);
  }, [title, chromeDocTitle, lastSavedId]);

  return null;
};
