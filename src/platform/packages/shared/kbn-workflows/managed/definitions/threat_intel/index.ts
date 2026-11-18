/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID = 'system-security-threat-intel-ingest-feeds';
export const THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID = 'system-security-threat-intel-enrich-report';
export const THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID =
  'system-security-threat-intel-attribute-alerts';

const MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;

const PLUGIN_ID = 'securitySolution';

const VISIBILITY = {
  solutions: ['security'],
} as const;

export const THREAT_INTEL_INGEST_FEEDS_WORKFLOW = {
  billable: true,
  id: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 2,
  visibility: VISIBILITY,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'ingest_threat_feeds.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const THREAT_INTEL_ENRICH_REPORT_WORKFLOW = {
  billable: true,
  id: THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 5,
  visibility: VISIBILITY,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'enrich_threat_report.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW = {
  billable: true,
  id: THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 2,
  visibility: VISIBILITY,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'attribute_alerts_to_reports.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const THREAT_INTEL_WORKFLOW_IDS = [
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
] as const;
