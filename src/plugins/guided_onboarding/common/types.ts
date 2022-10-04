/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type GuideId = 'observability' | 'security' | 'search';

export type ObservabilityStepIds = 'add_data' | 'view_dashboard' | 'tour_observability';
export type SecurityStepIds = 'add_data' | 'rules' | 'alerts' | 'cases';
export type SearchStepIds = 'add_data' | 'browse_docs' | 'search_experience';

export type GuideStepIds = ObservabilityStepIds | SecurityStepIds | SearchStepIds;

/**
 * Allowed states for a guide:
 *  in_progress: Guide has been started
 *  ready_to_complete: All steps have been completed, but the "Continue using Elastic" button has not been clicked
 *  complete: All steps and the guide have been completed
 */
export type GuideStatus = 'in_progress' | 'ready_to_complete' | 'complete';

/**
 * Allowed states for each step in a guide:
 *  inactive: Step has not started
 *  active: Step is ready to start (i.e., the guide has been started)
 *  in_progress: Step has been started and is in progress
 *  complete: Step has been completed
 */
export type StepStatus = 'inactive' | 'active' | 'in_progress' | 'complete';

export interface GuideStep {
  id: GuideStepIds;
  status: StepStatus;
}

export interface GuideState {
  guideId: GuideId;
  status: GuideStatus;
  isActive?: boolean; // Drives the current guide shown in the dropdown panel
  steps: GuideStep[];
}
