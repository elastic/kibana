/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideId, GuideState, GuideStepIds, StepStatus } from '@kbn/guided-onboarding';

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

/* To append a link to the description, specify its text and url in the properties.
 * An example:
 * {
 *   description: 'This is a description with a link'.
 *   linkText: 'My link',
 *   linkUrl: 'example.com',
 *   isLinkExternal: true,
 * }
 *
 */
export interface StepDescriptionWithLink {
  descriptionText: string;
  linkText: string;
  linkUrl: string;
  isLinkExternal?: boolean;
}

export interface StepConfig {
  id: GuideStepIds;
  title: string;
  // description is displayed as a single paragraph, can be combined with description list
  description?: string | StepDescriptionWithLink;
  // description list is displayed as an unordered list, can be combined with description
  descriptionList?: Array<string | StepDescriptionWithLink>;
  location?: {
    appID: string;
    path: string;
  };
  status?: StepStatus;
  integration?: string;
  manualCompletion?: {
    title: string;
    description: string;
    readyToCompleteOnNavigation?: boolean;
  };
}

export interface GuideConfig {
  title: string;
  description: string;
  guideName: string;
  telemetryId: string;
  docs?: {
    text: string;
    url: string;
  };
  completedGuideRedirectLocation?: {
    appID: string;
    path: string;
  };
  steps: StepConfig[];
}

export type GuidesConfig = {
  [key in GuideId]: GuideConfig;
};
