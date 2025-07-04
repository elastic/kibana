/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardCapabilities } from '../common/types';

export const capabilitiesProvider = (): {
  dashboard_v2: DashboardCapabilities;
} => ({
  dashboard_v2: {
    createNew: true,
    show: true,
    showWriteControls: true,
  },
});
