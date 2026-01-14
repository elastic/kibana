/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowEditorType } from '../types';

export enum WorkflowUIEventTypes {
  /**
   * When a workflow search is performed
   * This tracks search and filter usage patterns.
   */
  WorkflowSearched = 'workflows_workflow_searched',
  /**
   * When the workflow list page is viewed
   * This tracks list page views and pagination.
   */
  WorkflowListViewed = 'workflows_workflow_list_viewed',
  /**
   * When a workflow detail page is viewed
   * This tracks detail page views and tab usage.
   */
  WorkflowDetailViewed = 'workflows_workflow_detail_viewed',
}

export type WorkflowDetailTab = 'workflow' | 'executions' | 'logs';

/**
 * Parameters for workflow search telemetry.
 */
export interface ReportWorkflowSearchedActionParams {
  eventName: string;
  /**
   * Whether a search query was provided
   */
  hasQuery: boolean;
  /**
   * Whether any filters were applied
   */
  hasFilters: boolean;
  /**
   * Types of filters applied (e.g., 'enabled', 'createdBy')
   */
  filterTypes?: string[];
  /**
   * Number of results returned
   */
  resultCount: number;
}

/**
 * Parameters for workflow list view telemetry.
 */
export interface ReportWorkflowListViewedActionParams {
  eventName: string;
  /**
   * Number of workflows in the list
   */
  workflowCount: number;
  /**
   * The page number being viewed
   */
  pageNumber: number;
}

/**
 * Parameters for workflow detail view telemetry.
 */
export interface ReportWorkflowDetailViewedActionParams {
  eventName: string;
  /**
   * The workflow ID being viewed
   */
  workflowId: string;
  /**
   * The active tab on the detail page
   */
  tab: WorkflowDetailTab;
  /**
   * Editor context if viewing the workflow/editor tab
   */
  editorType?: WorkflowEditorType;
}

