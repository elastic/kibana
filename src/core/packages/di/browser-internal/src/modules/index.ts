/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import { loadAnalytics } from './analytics';
import { loadApplication } from './application';
import { loadCapabilities } from './capabilities';
import { loadChrome } from './chrome';
import { loadDocLinks } from './doc_links';
import { loadExecutionContext } from './execution_context';
import { loadFeatureFlags } from './feature_flags';
import { loadNavigation } from './navigation';
import { loadNotifications } from './notifications';
import { loadOverlays } from './overlays';
import { loadPricing } from './pricing';
import { loadSecurity } from './security';
import { loadSettings } from './settings';
import { loadTheme } from './theme';
import { loadUserProfile } from './user_profile';

export const core = new ContainerModule((options) => {
  loadAnalytics(options);
  loadApplication(options);
  loadCapabilities(options);
  loadChrome(options);
  loadDocLinks(options);
  loadExecutionContext(options);
  loadFeatureFlags(options);
  loadNavigation(options);
  loadNotifications(options);
  loadOverlays(options);
  loadPricing(options);
  loadSecurity(options);
  loadSettings(options);
  loadTheme(options);
  loadUserProfile(options);
});
