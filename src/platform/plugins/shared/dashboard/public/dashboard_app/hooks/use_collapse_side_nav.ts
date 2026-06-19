/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

import { coreServices } from '../../services/kibana_services';

/**
 * Collapse the project side nav when entering the dashboards app to maximize canvas space.
 */
export const useCollapseSideNav = (enabled = true) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    coreServices.chrome.sideNav.setIsCollapsed(true);
  }, [enabled]);
};
