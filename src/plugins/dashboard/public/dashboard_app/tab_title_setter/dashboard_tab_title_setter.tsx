/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/common';

import { pluginServices } from '../../services/plugin_services';
import { DashboardAPI } from '../..';
import { getDashboardTitle } from '../_dashboard_app_strings';

export const DashboardTabTitleSetter = ({
  dashboardContainer,
}: {
  dashboardContainer: DashboardAPI;
}) => {
  const {
    chrome: { docTitle: chromeDocTitle },
  } = pluginServices.getServices();
  const title = dashboardContainer.select((state) => state.explicitInput.title);
  const lastSavedId = dashboardContainer.select((state) => state.componentState.lastSavedId);

  /**
   * Set chrome tab title when dashboard's title changes
   */
  useEffect(() => {
    /** We do not want the tab title to include the "Editing" prefix, so always send in view mode */
    chromeDocTitle.change(getDashboardTitle(title, ViewMode.VIEW, !lastSavedId));
  }, [title, chromeDocTitle, lastSavedId]);

  return null;
};
