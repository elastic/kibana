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

export const NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID = 'system-security-native-vuln-scan';
export const NATIVE_VULN_SCANNER_REFRESH_WORKFLOW_ID = 'system-security-native-vuln-feed-refresh';

export const NATIVE_VULN_SCANNER_SCAN_WORKFLOW = {
  billable: true,
  id: NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
  management: {
    enablement: 'restorable',
    lifecycle: 'static',
    versionStrategy: 'auto',
  },
  pluginId: 'nativeVulnScanner',
  version: 1,
  visibility: {
    solutions: ['security'],
  },
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'scan.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const NATIVE_VULN_SCANNER_REFRESH_WORKFLOW = {
  billable: true,
  id: NATIVE_VULN_SCANNER_REFRESH_WORKFLOW_ID,
  management: {
    enablement: 'restorable',
    lifecycle: 'static',
    versionStrategy: 'auto',
  },
  pluginId: 'nativeVulnScanner',
  version: 1,
  visibility: {
    solutions: ['security'],
  },
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'refresh.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

/** Every workflow the native vulnerability scanner installs; install and uninstall both walk this list. */
export const NATIVE_VULN_SCANNER_WORKFLOW_IDS = [
  NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
  NATIVE_VULN_SCANNER_REFRESH_WORKFLOW_ID,
] as const;
