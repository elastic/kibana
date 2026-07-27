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
import { loadCapabilities } from './capabilities';
import { loadDocLinks } from './doc_links';
import { loadElasticsearch } from './elasticsearch';
import { loadExecutionContext } from './execution_context';
import { loadFeatureFlags } from './feature_flags';
import { loadHttp } from './http';
import { loadPricing } from './pricing';
import { loadSavedObjects } from './saved_objects';
import { loadSecurity } from './security';
import { loadUiSettings } from './ui_settings';
import { loadUserActivity } from './user_activity';
import { loadUserProfile } from './user_profile';

export const core = new ContainerModule((options) => {
  loadAnalytics(options);
  loadCapabilities(options);
  loadDocLinks(options);
  loadElasticsearch(options);
  loadExecutionContext(options);
  loadFeatureFlags(options);
  loadHttp(options);
  loadPricing(options);
  loadSavedObjects(options);
  loadSecurity(options);
  loadUiSettings(options);
  loadUserActivity(options);
  loadUserProfile(options);
});
