/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GuideState } from '@kbn/guided-onboarding';

/**
 * Guided onboarding overall status:
 *  not_started: no guides have been started yet
 *  in_progress: a guide is currently active
 *  complete: at least one guide has been completed
 *  quit: the user quit a guide before completion
 *  skipped: the user skipped on the landing page
 */
export type PluginStatus = 'not_started' | 'in_progress' | 'complete' | 'quit' | 'skipped';

export interface PluginState {
  status: PluginStatus;
  // a specific period after deployment creation when guided onboarding UI is highlighted
  isActivePeriod: boolean;
  activeGuide?: GuideState;
}
