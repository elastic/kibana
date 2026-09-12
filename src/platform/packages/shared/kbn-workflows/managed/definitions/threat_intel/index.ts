/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ATTRIBUTE_ALERTS_TO_REPORTS_YAML from './attribute_alerts_to_reports.yaml';
import ENRICH_THREAT_REPORT_YAML from './enrich_threat_report.yaml';
import INGEST_THREAT_FEEDS_YAML from './ingest_threat_feeds.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

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
  billable: false,
  id: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: VISIBILITY,
  yaml: INGEST_THREAT_FEEDS_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const THREAT_INTEL_ENRICH_REPORT_WORKFLOW = {
  billable: false,
  id: THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: VISIBILITY,
  yaml: ENRICH_THREAT_REPORT_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW = {
  billable: false,
  id: THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: PLUGIN_ID,
  version: 1,
  visibility: VISIBILITY,
  yaml: ATTRIBUTE_ALERTS_TO_REPORTS_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const THREAT_INTEL_WORKFLOW_IDS = [
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
] as const;
