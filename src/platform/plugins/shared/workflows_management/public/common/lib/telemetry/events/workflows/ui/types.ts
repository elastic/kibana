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
   * When the workflow list page is viewed
   * This tracks list page views, pagination, and search/filter usage patterns.
   */
  WorkflowListViewed = 'workflows_workflow_list_viewed',
  /**
   * When a workflow detail page is viewed
   * This tracks detail page views and tab usage.
   */
  WorkflowDetailViewed = 'workflows_workflow_detail_viewed',
  /**
   * When the create workflow page is opened (user navigates to /create).
   */
  WorkflowCreateOpened = 'workflows_workflow_create_opened',
  /**
   * When the workflows UI is blocked because the user lacks read privileges.
   */
  WorkflowAccessDeniedPrivileges = 'workflows_workflow_access_denied_privileges',
  /**
   * When the workflows UI is blocked because the license does not include Workflows (stateful).
   */
  WorkflowAccessDeniedLicense = 'workflows_workflow_access_denied_license',
  /**
   * When the workflows UI is blocked because the serverless project tier is insufficient.
   */
  WorkflowAccessDeniedServerlessTier = 'workflows_workflow_access_denied_serverless_tier',
  /**
   * When the global executions page is loaded.
   */
  WorkflowExecutionsPageViewed = 'workflows_executions_page_viewed',
  /**
   * When a filter is applied on the global executions page (time range, status, workflow, trigger type, test/prod, KQL).
   */
  WorkflowExecutionsFilterApplied = 'workflows_executions_filter_applied',
  /**
   * When a KQL search query is submitted on the global executions page.
   */
  WorkflowExecutionsSearchUsed = 'workflows_executions_search_used',
  /**
   * When an execution detail flyout is opened from the global executions page.
   */
  WorkflowExecutionsDetailOpened = 'workflows_executions_detail_opened',
  /**
   * When a step node is expanded/collapsed in the execution detail flyout.
   */
  WorkflowExecutionsStepExpanded = 'workflows_executions_step_expanded',
  /**
   * When "Edit workflow" (open in editor) is clicked from the executions page actions menu.
   */
  WorkflowExecutionsOpenInEditorClicked = 'workflows_executions_open_in_editor_clicked',
}

export type WorkflowDetailTab = 'workflow' | 'executions';

/**
 * Parameters for workflow list view telemetry.
 * This event tracks list page views, pagination, and search/filter usage.
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
  /**
   * Types of filters/search applied (e.g., 'query', 'enabled', 'createdBy').
   * Includes 'query' when a search query is used.
   */
  filterTypes?: string[];
}

/**
 * Parameters for workflow create opened telemetry.
 */
export interface ReportWorkflowCreateOpenedActionParams {
  eventName: string;
  editorType?: WorkflowEditorType;
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

/** Page view for the global executions page. */
export interface ReportWorkflowExecutionsPageViewedActionParams {
  eventName: string;
}

/** A filter was applied on the global executions page. */
export interface ReportWorkflowExecutionsFilterAppliedActionParams {
  eventName: string;
  /**
   * Which filter slots are active, e.g. ['status', 'workflowId', 'timeRange', 'query'].
   */
  filterTypes: string[];
}

/** A KQL search query was submitted on the global executions page. */
export interface ReportWorkflowExecutionsSearchUsedActionParams {
  eventName: string;
  hasQuery: boolean;
}

/** An execution detail flyout was opened from the global executions page. */
export interface ReportWorkflowExecutionsDetailOpenedActionParams {
  eventName: string;
  executionId: string;
}

/** A step node was expanded in the execution step tree. */
export interface ReportWorkflowExecutionsStepExpandedActionParams {
  eventName: string;
  stepType: string;
}

/** "Edit workflow" (open in editor) was clicked from the executions page actions menu. */
export interface ReportWorkflowExecutionsOpenInEditorClickedActionParams {
  eventName: string;
  workflowId: string;
  origin: 'table_actions' | 'flyout_actions';
}

/** Shown when the user cannot read workflows due to Kibana privileges. */
export interface ReportWorkflowAccessDeniedPrivilegesActionParams {
  eventName: string;
}

/** Shown when Workflows is not available under the current license (stateful). */
export interface ReportWorkflowAccessDeniedLicenseActionParams {
  eventName: string;
}

/** Shown when Workflows requires a higher serverless product tier. */
export interface ReportWorkflowAccessDeniedServerlessTierActionParams {
  eventName: string;
}
