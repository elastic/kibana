/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

export interface EmbeddedDashboardMenuProps {
  config?: AppMenuConfig;
}

/**
 * Dashboard menu for dashboards embedded with the `embed=true` URL param. Chrome is hidden, so
 * pushing the menu through `chrome.setAppMenu` would render nothing. Render the menu inline instead.
 */
export const EmbeddedDashboardMenu = ({ config }: EmbeddedDashboardMenuProps) => (
  <AppMenuComponent config={config} />
);
