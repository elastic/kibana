/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Must equal the id the plugin passes to `registerManagedWorkflowOwner` and
 * `initManagedWorkflowsClient`: `assertPluginRegistration` throws on install
 * when a definition's `pluginId` and the registering plugin disagree.
 */
export const AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_PLUGIN_ID = 'agenticInvestigations';

export const AGENTIC_INVESTIGATIONS_WORKFLOW_MANAGEMENT = {
  enablement: 'enforced',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;
