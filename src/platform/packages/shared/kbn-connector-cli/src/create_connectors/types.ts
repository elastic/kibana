/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A single secret field in a manifest — either a static value, a vault reference, or a URL template. */
export interface ManifestSecretField {
  /** Static value (e.g., a fixed headerField name or URL). */
  value?: string;
  /** Vault secret path (e.g., "secret/ent-search-team/connectors-sources/slack"). */
  vault?: string;
  /** Vault field name within the secret (e.g., "token", "client-id"). */
  field?: string;
  /**
   * URL template with `{varName}` placeholders, resolved using `vars`.
   * Example: "https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize"
   */
  template?: string;
  /** Variable sources for `template` placeholders — each resolved as a vault or static value. */
  vars?: Record<string, { vault: string; field: string } | { value: string }>;
}

/** Raw YAML manifest structure for a single connector. */
export interface Manifest {
  spec_id: string;
  name: string;
  auth_type: string;
  /** Set to false to skip this manifest (e.g., vault paths not yet configured). Defaults to true. */
  enabled?: boolean;
  config?: Record<string, string>;
  secrets: Record<string, ManifestSecretField>;
}

/** A manifest with all secrets resolved to concrete string values. */
export interface ResolvedManifest {
  specId: string;
  name: string;
  authType: string;
  config: Record<string, string>;
  secrets: Record<string, string>;
}

/** Result of attempting to create a single connector. */
export interface ConnectorResult {
  name: string;
  specId: string;
  status: 'created' | 'skipped' | 'failed';
  message?: string;
  connectorId?: string;
}
