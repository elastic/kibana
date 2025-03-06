/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GuideId, GuideState, GuideConfig } from '@kbn/guided-onboarding';

/**
 * Guided onboarding overall status:
 *  not_started: no guides have been started yet
 *  in_progress: a guide is currently active
 *  complete: at least one guide has been completed
 *  quit: the user quit a guide before completion
 *  skipped: the user skipped on the landing page
 *  error: unable to retrieve the plugin state from saved objects
 */
export type PluginStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'quit'
  | 'skipped'
  | 'error';

export interface PluginState {
  status: PluginStatus;
  // a specific period after deployment creation when guided onboarding UI is highlighted
  isActivePeriod: boolean;
  activeGuide?: GuideState;
}

export type GuidesConfig = {
  [key in GuideId]: GuideConfig;
};
