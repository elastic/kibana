/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardCapabilities } from '../../common';
import { coreServices } from '../services/kibana_services';

export const getDashboardCapabilities = (): DashboardCapabilities => {
  const {
    application: {
      capabilities: { dashboard_v2: dashboard },
    },
  } = coreServices;

  return {
    show: Boolean(dashboard.show),
    createNew: Boolean(dashboard.createNew),
    createShortUrl: Boolean(dashboard.createShortUrl),
    showWriteControls: Boolean(dashboard.showWriteControls),
    storeSearchSession: Boolean(dashboard.storeSearchSession),
  };
};
