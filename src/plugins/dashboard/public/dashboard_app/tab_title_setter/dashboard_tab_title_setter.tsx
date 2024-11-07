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
import { DashboardApi } from '../..';
import { getNewDashboardTitle } from '../_dashboard_app_strings';
import { coreServices } from '../../services/kibana_services';

export const DashboardTabTitleSetter = ({ dashboardApi }: { dashboardApi: DashboardApi }) => {
  const [title, lastSavedId] = useBatchedPublishingSubjects(
    dashboardApi.panelTitle,
    dashboardApi.savedObjectId
  );

  /**
   * Set chrome tab title when dashboard's title changes
   */
  useEffect(() => {
    coreServices.chrome.docTitle.change(
      !lastSavedId ? getNewDashboardTitle() : title ?? lastSavedId
    );
  }, [title, lastSavedId]);

  return null;
};
