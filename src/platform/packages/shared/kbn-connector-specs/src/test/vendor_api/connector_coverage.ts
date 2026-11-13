/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import { connectorSpecHasEvents } from '../../connector_spec_has_events';
import type { VendorApiManifest } from './manifest';
import { isMarkdownFormat } from './manifest';

export type CoverageDirection = 'outbound' | 'inbound' | 'both';

export type CoverageApiType =
  | 'openapi'
  | 'swagger'
  | 'discovery'
  | 'smithy'
  | 'markdown'
  | 'mcp'
  | 'database'
  | 'generic'
  | 'none';

export interface ConnectorCoverageDocument {
  readonly connector_id: string;
  readonly direction: CoverageDirection;
  readonly api_type: CoverageApiType;
  /** Whether the connector has `vendor_api` artifacts, so the emulator can serve it. */
  readonly emulated: boolean;
  /** `full` when the connector is recorded; `none` when it is exempt or not yet recorded. */
  readonly drift_protection: 'full' | 'none';
  readonly exemption_reason?: string;
}

const hasActions = (spec: ConnectorSpec): boolean => Object.keys(spec.actions).length > 0;

/** Inbound events and outbound actions both count; a spec with neither is reported as outbound. */
export const getDirection = (spec: ConnectorSpec): CoverageDirection => {
  const inbound = connectorSpecHasEvents(spec);
  if (inbound && hasActions(spec)) return 'both';
  return inbound ? 'inbound' : 'outbound';
};

/**
 * Stopgap until exemptions carry a category: reads the free-text reason. The first match wins,
 * so an MCP connector that also mentions a driver stays `mcp`.
 */
export const getExemptApiType = (reason: string): CoverageApiType => {
  if (/\bMCP\b/.test(reason)) return 'mcp';
  if (/\bdriver\b|\bTDS\b|\bdatabase\b/i.test(reason)) return 'database';
  if (/^Generic connector|user-configured|user configures/i.test(reason)) return 'generic';
  return 'none';
};

/** The API type of a recorded connector: its sources' format, or the most used one if mixed. */
export const getRecordedApiType = (manifest: VendorApiManifest): CoverageApiType => {
  const counts = new Map<CoverageApiType, number>();
  for (const { format } of Object.values(manifest.sources)) {
    const type: CoverageApiType = isMarkdownFormat(format) ? 'markdown' : format;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  const [mostUsed] = [...counts.entries()].sort(([, a], [, b]) => b - a)[0] ?? [];
  return mostUsed ?? 'none';
};

export const buildCoverageDocument = ({
  spec,
  manifest,
  exemptionReason,
}: {
  spec: ConnectorSpec;
  manifest?: VendorApiManifest;
  exemptionReason?: string;
}): ConnectorCoverageDocument => {
  const base = { connector_id: spec.metadata.id, direction: getDirection(spec) };
  if (manifest) {
    return {
      ...base,
      api_type: getRecordedApiType(manifest),
      emulated: true,
      drift_protection: 'full',
    };
  }
  return {
    ...base,
    api_type: exemptionReason ? getExemptApiType(exemptionReason) : 'none',
    emulated: false,
    drift_protection: 'none',
    ...(exemptionReason ? { exemption_reason: exemptionReason } : {}),
  };
};
