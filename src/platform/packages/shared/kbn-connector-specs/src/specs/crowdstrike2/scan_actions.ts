/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import {
  FALCON_DEFAULT_SCAN_PAUSE_DURATION,
  SCAN_DEFAULT_CPU_PRIORITY,
  SCAN_ID_PATTERN,
  SCOPES,
} from './constants';
import {
  errorsOf,
  falconRequest,
  fetchDetails,
  fqlQuote,
  lookupResult,
  offsetPage,
  paginationTotal,
  resourcesOf,
} from './client';
import type { CreateScanInput, GetScanResultsInput } from './types';
import { CreateScanInputSchema, GetScanResultsInputSchema } from './types';

/**
 * The scan body: the fields given, quarantine off unless asked for, the lowest CPU priority unless
 * one is given, and a pause no longer than max_duration. No initiated_from: Falcon set it to
 * cloud_adhoc although the connector sent its own value (live US-2), so it has no effect.
 */
export const buildScanBody = (input: CreateScanInput): Record<string, unknown> => {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      body[key] = value;
    }
  }
  if (input.hosts !== undefined) {
    body.hosts = [...new Set(input.hosts.map((id) => id.toLowerCase()))];
  }
  if (input.host_groups !== undefined) {
    body.host_groups = [...new Set(input.host_groups)];
  }
  if (
    input.pause_duration === undefined &&
    input.max_duration !== undefined &&
    input.max_duration < FALCON_DEFAULT_SCAN_PAUSE_DURATION
  ) {
    body.pause_duration = input.max_duration;
  }
  return {
    ...body,
    cpu_priority: input.cpu_priority ?? SCAN_DEFAULT_CPU_PRIORITY,
    quarantine: input.quarantine ?? false,
  };
};

export const scanActions: ConnectorSpec['actions'] = {
  createScan: {
    isTool: true,
    scope: 'write',
    description:
      'Start an on-demand scan on hosts or host groups; one of them is required. Files are quarantined only when quarantine is true. Returns scan_id.',
    input: CreateScanInputSchema,
    handler: async (ctx, input: CreateScanInput) => {
      const response = await falconRequest(ctx, {
        method: 'POST',
        path: '/ods/entities/scans/v1',
        data: buildScanBody(input),
        retryServerErrors: false,
        scope: SCOPES.odsWrite,
      });
      const resources = resourcesOf<{ id?: unknown }>(response.data);
      const scanId = resources[0]?.id;
      return {
        scan_id: typeof scanId === 'string' ? scanId : null,
        resources,
        errors: errorsOf(response.data),
        meta: response.data?.meta,
      };
    },
  },
  getScanResults: {
    isTool: true,
    scope: 'read',
    description:
      'Read an on-demand scan by scan_id: status, file counts and one page of malicious files.',
    input: GetScanResultsInputSchema,
    handler: async (ctx, input: GetScanResultsInput) => {
      if (!SCAN_ID_PATTERN.test(input.scan_id)) {
        throw new Error('A scan id has letters, digits, - and _ only.');
      }
      const scanResponse = await falconRequest(ctx, {
        method: 'GET',
        path: '/ods/entities/scans/v1',
        params: { ids: [input.scan_id] },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.odsRead,
      });
      const scanResult = lookupResult(scanResponse);
      const scan = scanResult.resources[0] ?? null;
      if (input.include_files === false) {
        return {
          scan,
          malicious_files: [],
          malicious_files_total: null,
          next_offset: null,
          errors: scanResult.errors,
          meta: scanResult.meta,
        };
      }
      const page = await offsetPage(ctx, {
        path: '/ods/queries/malicious-files/v1',
        params: {
          filter: `scan_id:${fqlQuote(input.scan_id)}`,
          offset: input.offset,
          limit: input.limit ?? 100,
        },
        scope: SCOPES.odsRead,
      });
      const ids = page.resources.filter((id): id is string => typeof id === 'string');
      const files =
        ids.length === 0
          ? { resources: [], errors: [] }
          : await fetchDetails(ctx, '/ods/entities/malicious-files/v1', ids, SCOPES.odsRead);
      return {
        scan,
        malicious_files: files.resources,
        malicious_files_total: paginationTotal(page, files.resources.length),
        next_offset: page.next_offset,
        errors: [...scanResult.errors, ...page.errors, ...files.errors],
        meta: scanResult.meta,
      };
    },
  },
};
