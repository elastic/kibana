/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTestConfig } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';

export interface ScoutMcpConfig {
  /** Target Kibana base URL */
  targetUrl: string;
  /** Deployment mode: stateful or serverless */
  mode: 'stateful' | 'serverless';
  /** Serverless project type (if mode is serverless) */
  projectType?: 'es' | 'oblt' | 'security';
  /** Path to Scout config file (optional) */
  configPath?: string;
  /** Scout test configuration */
  scoutConfig?: ScoutTestConfig;
  /** Whether to ignore HTTPS errors (default: false, enabled for security) */
  ignoreHTTPSErrors?: boolean;
}

export interface ScoutMcpOptions extends ScoutMcpConfig {
  /** Logger instance */
  log: ToolingLog;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface NavigateParams {
  url?: string;
  app?: string;
  path?: string;
}

export interface ClickParams {
  testSubj?: string;
  selector?: string;
  /** Human-readable description of the element being clicked (for audit/permission) */
  element?: string;
}

export interface TypeParams {
  testSubj?: string;
  selector?: string;
  /** Human-readable description of the element (for audit/permission) */
  element?: string;
  text: string;
  submit?: boolean;
  slowly?: boolean;
}

export interface SnapshotParams {
  format?: 'text' | 'json';
}

export interface ScreenshotParams {
  filename?: string;
  fullPage?: boolean;
  testSubj?: string;
  selector?: string;
}

export interface WaitForParams {
  time?: number;
  text?: string;
  testSubj?: string;
  selector?: string;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

/**
 * Login parameters for Scout authentication
 *
 * @property role - Role name to authenticate with. Can be:
 *   - 'admin': Full Kibana and Elasticsearch access
 *   - 'viewer': Read-only permissions
 *   - 'privileged': Non-admin role (editor for stateful, developer for ES serverless, editor for Security/Oblt serverless)
 *   - Any other supported role name from roles.yml
 * @property customRole - Optional custom role definition (KibanaRole or ElasticsearchRoleDescriptor)
 *   When provided, a unique custom role will be created with the specified privileges
 */
export interface LoginParams {
  role: 'admin' | 'viewer' | 'privileged' | string;
  customRole?: {
    kibana?: Array<{
      spaces: string[];
      base?: string[];
      feature?: Record<string, string[]>;
    }>;
    elasticsearch?: {
      cluster?: string[];
      indices?: Array<{
        names: string[];
        privileges: string[];
      }>;
    };
    // For Elasticsearch role descriptors
    applications?: Array<{
      application: string;
      privileges: string[];
      resources: string[];
    }>;
  };
}

export interface EuiComponentParams {
  component: 'comboBox' | 'dataGrid' | 'checkBox' | 'toast' | 'selectable';
  testSubj?: string;
  selector?: string;
  action: string;
  params?: any;
}

// Test Analysis Tool Parameters
export interface AnalyzeTestSuitabilityParams {
  testDescription: string;
  testCode?: string;
  context?: 'cypress_migration' | 'new_test_generation' | 'general';
}

export interface AnalyzeTestSuiteParams {
  cypressTestDirectory: string;
  filePattern?: string;
}

// Migration Tool Parameters
export interface AssessMigrationRiskParams {
  cypressTestCode: string;
}

export interface SuggestTestConversionParams {
  cypressTestCode: string;
  testDescription: string;
}
