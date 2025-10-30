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
  /** Element reference from ARIA snapshot (e.g., 'e1', 'e2') for precise targeting */
  ref?: string;
  /** Human-readable description of the element being clicked (for audit/permission) */
  element?: string;
}

export interface TypeParams {
  testSubj?: string;
  selector?: string;
  /** Element reference from ARIA snapshot (e.g., 'e1', 'e2') for precise targeting */
  ref?: string;
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
  /** Element reference from ARIA snapshot (e.g., 'e1', 'e2') for precise targeting */
  ref?: string;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

export interface LoginParams {
  role: 'admin' | 'viewer' | 'privileged' | string;
  customRole?: {
    name: string;
    kibana: Array<{
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
  };
}

export interface PageObjectParams {
  pageObject:
    | 'discover'
    | 'dashboard'
    | 'filterBar'
    | 'datePicker'
    | 'maps'
    | 'collapsibleNav'
    | 'toasts';
  method: string;
  args?: any[];
}

export interface EuiComponentParams {
  component: 'comboBox' | 'dataGrid' | 'checkBox' | 'toast' | 'selectable';
  testSubj?: string;
  selector?: string;
  action: string;
  params?: any;
}

export interface ApiServiceParams {
  service: 'alerting' | 'cases' | 'fleet' | 'streams';
  method: string;
  args?: any[];
}

export interface EsQueryParams {
  index: string;
  body: any;
}

export interface KibanaApiParams {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: any;
}

export interface EsArchiverParams {
  action: 'load' | 'unload';
  archiveName: string;
}
