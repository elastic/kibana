/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { KibanaClient } from '../shared/base_kibana_client';

const MONITORS_PATH = '/api/synthetics/monitors';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_SPACE_ID = 'default';
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_BROWSER_SCRIPT = `step('Load page', async () => {
  await page.goto('https://www.elastic.co');
});`;

export type SyntheticsMonitorConfigType = 'http' | 'tcp' | 'icmp' | 'browser';

/**
 * Derives a stable UUID from a key. Kibana only accepts UUIDs as predefined monitor ids
 * (monitors have encrypted attributes), so scenarios build their ids with this.
 */
export const getMonitorConfigId = (key: string): string => {
  const bytes = createHash('sha256').update(`synthtrace:${key}`).digest();
  // Version 4 (what Kibana generates) and the RFC 4122 variant, set arithmetically to avoid
  // bitwise operators.
  bytes[6] = (bytes[6] % 16) + 0x40;
  bytes[8] = (bytes[8] % 64) + 0x80;
  const hex = bytes.subarray(0, 16).toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

export interface SyntheticsMonitorConfig {
  /** A UUID (see `getMonitorConfigId`), used as the monitor's config id in check documents. */
  id: string;
  type: SyntheticsMonitorConfigType;
  name: string;
  /** URL for http, `host:port` for tcp, host for icmp. Not used by browser monitors. */
  target?: string;
  /** Inline journey script, browser monitors only. */
  script?: string;
  scheduleMinutes: number;
  tags?: string[];
  /** Ids of public (service managed) locations. */
  locations?: string[];
  /** Ids of private locations. */
  privateLocations?: string[];
  enabled?: boolean;
}

interface MonitorsListResponse {
  monitors: Array<{ id: string; config_id?: string }>;
  total: number;
}

interface MonitorDeleteResult {
  id: string;
  deleted: boolean;
  error?: string;
}

/** `POST /monitors/_bulk_delete` answers 200 even when a monitor was not removed. */
interface BulkDeleteMonitorsResponse {
  result?: MonitorDeleteResult[];
  /** Sync errors from the location services. An empty list, or absent, when the sync succeeded. */
  errors?: unknown;
}

export interface SyntheticsMonitorsApi {
  /** Creates the monitors; fails if one of the ids already exists. */
  createMonitors(configs: SyntheticsMonitorConfig[]): Promise<void>;
  /** Deletes every monitor that carries this API's tag and returns how many were deleted. */
  deleteMonitors(): Promise<number>;
}

const deletedCount = (
  ids: string[],
  response: BulkDeleteMonitorsResponse | undefined,
  tag: string
): number => {
  const results = response?.result ?? [];
  const deleted = results.filter((result) => result.deleted);
  const notDeleted = results.filter((result) => !result.deleted);
  const syncErrors = Array.isArray(response?.errors) ? response.errors : [];

  if (deleted.length === ids.length && notDeleted.length === 0 && syncErrors.length === 0) {
    return deleted.length;
  }

  const failed = notDeleted
    .map((result) => (result.error ? `${result.id} (${result.error})` : result.id))
    .join(', ');

  throw new Error(
    `Failed to delete every monitor tagged ${tag}: ${deleted.length} of ${ids.length} deleted` +
      (failed ? `; not deleted: ${failed}` : '') +
      (syncErrors.length > 0 ? `; service sync errors: ${JSON.stringify(syncErrors)}` : '')
  );
};

const getTargetFields = ({ type, target, script }: SyntheticsMonitorConfig) => {
  switch (type) {
    case 'http':
      return { urls: target };
    case 'tcp':
    case 'icmp':
      return { hosts: target };
    case 'browser':
      return { 'source.inline.script': script ?? DEFAULT_BROWSER_SCRIPT };
  }
};

const toRequestBody = (config: SyntheticsMonitorConfig, tag: string) => {
  const { type, name, scheduleMinutes, enabled = true } = config;
  const { tags = [], locations = [], privateLocations = [] } = config;

  return {
    type,
    name,
    enabled,
    tags: Array.from(new Set([tag, ...tags])),
    schedule: { number: String(scheduleMinutes), unit: 'm' },
    ...(locations.length > 0 ? { locations } : {}),
    ...(privateLocations.length > 0 ? { private_locations: privateLocations } : {}),
    ...getTargetFields(config),
  };
};

/**
 * Creates and removes the Synthetics monitor configurations that a scenario's check
 * documents point at. Monitors are marked with `tag` so that cleanup only touches them.
 */
export const createSyntheticsMonitorsApi = ({
  kibana,
  tag,
  spaceId = DEFAULT_SPACE_ID,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  kibana: Pick<KibanaClient, 'fetch'>;
  tag: string;
  spaceId?: string;
  pageSize?: number;
}): SyntheticsMonitorsApi => {
  const withSpace = (path: string) =>
    spaceId === DEFAULT_SPACE_ID ? path : `/s/${encodeURIComponent(spaceId)}${path}`;

  const listMonitorIds = async (): Promise<string[]> => {
    const ids: string[] = [];

    for (let page = 1; ; page++) {
      const query = new URLSearchParams({
        tags: tag,
        perPage: String(pageSize),
        page: String(page),
      });
      const response = await kibana.fetch<MonitorsListResponse>(
        `${withSpace(MONITORS_PATH)}?${query}`,
        { method: 'GET' }
      );

      ids.push(...response.monitors.map((monitor) => monitor.config_id ?? monitor.id));

      if (response.monitors.length === 0 || ids.length >= response.total) {
        return ids;
      }
    }
  };

  return {
    createMonitors: async (configs) => {
      for (const config of configs) {
        const { id, name, locations = [], privateLocations = [] } = config;
        if (!UUID_PATTERN.test(id)) {
          throw new Error(
            `Monitor "${name}" has id "${id}", but Kibana only accepts UUIDs as predefined monitor ids. Use getMonitorConfigId().`
          );
        }
        if (locations.length + privateLocations.length === 0) {
          throw new Error(`Monitor "${name}" needs at least one public or private location`);
        }

        await kibana.fetch(`${withSpace(MONITORS_PATH)}?id=${encodeURIComponent(id)}`, {
          method: 'POST',
          body: JSON.stringify(toRequestBody(config, tag)),
        });
      }
    },

    deleteMonitors: async () => {
      const ids = await listMonitorIds();
      if (ids.length === 0) {
        return 0;
      }

      const response = await kibana.fetch<BulkDeleteMonitorsResponse>(
        `${withSpace(MONITORS_PATH)}/_bulk_delete`,
        {
          method: 'POST',
          body: JSON.stringify({ ids }),
        }
      );

      return deletedCount(ids, response, tag);
    },
  };
};
