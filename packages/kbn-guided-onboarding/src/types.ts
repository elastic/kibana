/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type GuideId =
  | 'kubernetes'
  | 'siem'
  | 'appSearch'
  | 'websiteSearch'
  | 'databaseSearch'
  | 'testGuide';

type KubernetesStepIds = 'add_data' | 'view_dashboard' | 'tour_observability';
type SiemStepIds = 'add_data' | 'rules' | 'alertsCases';
type SearchStepIds = 'add_data' | 'search_experience';
type TestGuideIds = 'step1' | 'step2' | 'step3' | 'step4';

export type GuideStepIds = KubernetesStepIds | SiemStepIds | SearchStepIds | TestGuideIds;

export type GuideParams = Record<string, string>;

export interface GuideState {
  guideId: GuideId;
  status: GuideStatus;
  isActive?: boolean; // Drives the current guide shown in the dropdown panel
  steps: GuideStep[];
  params?: GuideParams;
}

/**
 * Allowed states for a guide:
 *  not_started: Guide has not been started
 *  in_progress: At least one step in the guide has been started
 *  ready_to_complete: All steps have been completed, but the "Continue using Elastic" button has not been clicked
 *  complete: All steps and the guide have been completed
 */
export type GuideStatus = 'not_started' | 'in_progress' | 'ready_to_complete' | 'complete';

/**
 * Allowed states for each step in a guide:
 *  inactive: Step has not started
 *  active: Step is ready to start (i.e., the guide has been started)
 *  in_progress: Step has been started and is in progress
 *  ready_to_complete: Step can be manually completed
 *  complete: Step has been completed
 */
export type StepStatus = 'inactive' | 'active' | 'in_progress' | 'ready_to_complete' | 'complete';

export interface GuideStep {
  id: GuideStepIds;
  status: StepStatus;
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
  /*
   * Kibana location where the user will be redirected when starting or continuing a guide step.
   * The property `path` can use dynamic parameters, for example `testPath/{indexID}/{pageID}.
   * For the dynamic path to be configured correctly, the values of the parameters need to be passed to
   * the api service when completing one of the previous steps.
   * For example, if step 2 has a dynamic parameter `indexID` in its location path
   * { appID: 'test', path: 'testPath/{indexID}', params: ['indexID'] },
   * its value needs to be passed to the api service when completing step 1. For example,
   * `guidedOnboardingAPI.completeGuideStep('testGuide', 'step1', { indexID: 'testIndex' })
   */
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
