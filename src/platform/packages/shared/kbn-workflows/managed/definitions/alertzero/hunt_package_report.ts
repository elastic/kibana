/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from './constants';
import HUNT_PACKAGE_REPORT_YAML from './hunt_package_report.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID = 'system-security-hunt-package-report';

/**
 * Child invoked by PR 4's tagged Worker (`hunt_continuous_threat_hunt.yaml`)
 * via `workflow.execute`. Wraps the native `hunt.packageReport` step type,
 * fans mint payloads out to per-Proposal gate children, and closes the
 * Investigation benignly on a clean run. Tagged `security` +
 * `continuous-threat-hunt` (not `watch`/`watch-hunt`, which stays
 * Worker-only) for Workflows-list findability, matching every other Watch's
 * own feature children. Owns no trigger of its own, so enablement is
 * `enforced` (a disabled child would silently break its parent) regardless
 * of the tags, matching `hunt.yaml` and `find_or_create_investigation.yaml`.
 */
export const ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW = {
  billable: false,
  id: ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: HUNT_PACKAGE_REPORT_YAML,
} as const satisfies ManagedWorkflowDefinition;
