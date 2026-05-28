/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CliArgs {
  kibanaUrl: string;
  esUrl: string;
  user: string;
  password: string;
  space: string;
  output: string;
  headed: boolean;
}

export interface Persona {
  id: string;
  name: string;
  username: string;
  password: string;
  roleName: string;
  roleDescriptor: RoleDescriptor;
}

export interface RoleDescriptor {
  elasticsearch: {
    cluster?: string[];
    indices?: Array<{ names: string[]; privileges: string[] }>;
  };
  kibana: Array<{
    base?: string[];
    feature?: Record<string, string[]>;
    spaces: string[];
  }>;
}

export type EndpointId =
  | 'risk_engine'
  | 'entity_store'
  | 'leads'
  | 'watchlists'
  | 'asset_criticality';

export type PrivilegeField = 'has_all_required' | 'has_read_permissions' | 'has_write_permissions';

export interface PrivilegeResponse {
  has_all_required: boolean;
  has_read_permissions: boolean;
  has_write_permissions: boolean;
  privileges: {
    elasticsearch?: {
      index?: Record<string, Record<string, boolean>>;
      cluster?: Record<string, boolean>;
    };
    kibana?: Record<string, boolean> | Array<Record<string, boolean>>;
  };
}

export interface CorrelationEntry {
  featureName: string;
  endpoint: EndpointId;
  privilegeField: PrivilegeField;
  expectedWhenDenied: string;
  page: string;
  /**
   * Visible text expected in the page when access is DENIED.
   * Uses substring match — partial strings are fine.
   */
  textWhenDenied?: string[];
  /**
   * Visible text expected in the page when access is GRANTED.
   * Uses substring match — partial strings are fine.
   */
  textWhenGranted?: string[];
  /**
   * Names of buttons (aria-label or button text) that should be
   * aria-disabled when access is DENIED and enabled when GRANTED.
   */
  buttonDisabledWhenDenied?: string[];
}

export interface ApiProbeResult {
  personaId: string;
  endpointId: EndpointId;
  response: PrivilegeResponse | null;
  error?: string;
}

export interface InBrowserApiResult {
  endpointId: EndpointId;
  response: PrivilegeResponse | null;
  error?: string;
}

export type ObservedState = 'present' | 'absent' | 'disabled' | 'error' | 'skipped';

export interface BrowserCheckResult {
  featureName: string;
  observed: ObservedState;
  details?: string;
}

export type AuditStatus = 'PASS' | 'API_ONLY' | 'FAIL' | 'ERROR';

export interface AuditResult {
  persona: Persona;
  featureName: string;
  /** Kibana page path for this feature (e.g. /app/security/entity_analytics) */
  page: string;
  endpoint: EndpointId;
  privilegeField: PrivilegeField;
  apiValue: boolean | null;
  browserObserved: ObservedState | null;
  expectedWhenDenied: string;
  status: AuditStatus;
  details?: string;
}

// ─── Flyout types ────────────────────────────────────────────────────────────

/**
 * One entry per flyout panel that is privilege-gated.
 * selectorWhenGranted is present in the DOM when the persona has the permission.
 */
export interface FlyoutCorrelationEntry {
  panelLabel: string;
  endpoint: EndpointId;
  privilegeField: PrivilegeField;
  /** CSS selector expected to be PRESENT in the DOM when permission is granted */
  selectorWhenGranted: string;
}

export type FlyoutStatus = 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';

export interface FlyoutCheckResult {
  panelLabel: string;
  endpoint: EndpointId;
  privilegeField: PrivilegeField;
  /** Value returned by the privilege API; null if endpoint errored */
  apiValue: boolean | null;
  /** DOM state observed after flyout opened */
  observed: ObservedState;
  status: FlyoutStatus;
  details?: string;
}

export interface PersonaBrowserResult {
  personaId: string;
  apiResults: InBrowserApiResult[];
  browserChecks: BrowserCheckResult[];
  flyoutChecks: FlyoutCheckResult[];
  flyoutSkipReason?: string;
  /**
   * Privilege API calls intercepted from the browser during page renders.
   * Keys are EndpointId; values are the raw response body the UI received.
   * Used to verify the UI is wired to the correct privilege endpoints.
   */
  interceptedNetworkCalls: Record<string, unknown>;
}

// ─── Seed context ────────────────────────────────────────────────────────────

export interface SeedContext {
  /** ID of the watchlist created for the test entity; null if creation failed */
  watchlistId: string | null;
}
