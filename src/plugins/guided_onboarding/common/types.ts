/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type UseCase = 'observability' | 'security' | 'search';

/**
 * Inactive: Guide is inactive
 * Active: Guide has been initiated, but no steps have been started
 * In progress: Guide has been initiated and steps are in progress
 * Ready to complete: Steps have been completed, but "Continue using Elastic" has not been clicked
 * Complete: Steps and guide have been completed
 */
export type GuideStatus = 'in_progress' | 'ready_to_complete' | 'complete';

/**
 * Inactive: Step has not started
 * Active: Step is ready to start (i.e., guide has been activated)
 * In progress: Step has been started and is in progress
 * Complete: Step has been completed
 */
export type StepStatus = 'inactive' | 'active' | 'in_progress' | 'complete';

export interface StepConfig {
  id: string;
  title: string;
  descriptionList: string[];
  location?: {
    appID: string;
    path: string;
  };
  status?: StepStatus;
}
export interface GuideConfig {
  title: string;
  description: string;
  docs?: {
    text: string;
    url: string;
  };
  steps: StepConfig[];
}

export type GuidesConfig = {
  [key in UseCase]: GuideConfig;
};

export type ObservabilitySteps = 'add_data' | 'view_dashboard' | 'tour_observability';
export type SecuritySteps = 'add_data' | 'rules' | 'alerts' | 'cases';
export type SearchSteps = 'add_data' | 'browse_docs' | 'search_experience';

export interface GuideSavedObject {
  guideId: UseCase;
  status: GuideStatus;
  isActive?: boolean;
  steps: Array<{
    id: ObservabilitySteps | SecuritySteps | SearchSteps;
    status: StepStatus;
  }>;
}
