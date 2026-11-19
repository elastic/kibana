/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import { ALERTS_RESULT_WINDOW, SCOPES } from './constants';
import {
  errorsOf,
  falconRequest,
  fqlQuote,
  lookupResult,
  names,
  nextAfter,
  offsetPage,
  resourcesOf,
} from './client';
import { sentOutcomes } from './format';
import type {
  DeleteIOCInput,
  FindHostsByIndicatorInput,
  GetAlertDetailsInput,
  IndicatorType,
  SearchAlertsInput,
  SearchIOCsInput,
  UpdateAlertInput,
  UploadIOCInput,
} from './types';
import {
  DeleteIOCInputSchema,
  FindHostsByIndicatorInputSchema,
  GetAlertDetailsInputSchema,
  SearchAlertsInputSchema,
  SearchIOCsInputSchema,
  UpdateAlertInputSchema,
  UploadIOCInputSchema,
} from './types';
import { caseActions } from './case_actions';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hashes and domains are case-insensitive in Falcon; they are sent lower-cased. */
const normalizeIndicator = (type: IndicatorType, value: string) =>
  type === 'ipv4' || type === 'ipv6' ? value : value.toLowerCase();

/** ANDs the raw filter with the convenience filters, quoting every value. */
export const buildAlertFilter = (input: SearchAlertsInput): string | undefined => {
  const parts = [
    input.filter ? `(${input.filter})` : undefined,
    input.status ? `status:${fqlQuote(input.status)}` : undefined,
    input.severity_min !== undefined ? `severity:>=${input.severity_min}` : undefined,
    input.device_id ? `device.device_id:${fqlQuote(input.device_id)}` : undefined,
    input.hostname ? `device.hostname:${fqlQuote(input.hostname)}` : undefined,
    input.start_time ? `created_timestamp:>=${fqlQuote(input.start_time)}` : undefined,
    input.end_time ? `created_timestamp:<=${fqlQuote(input.end_time)}` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('+') : undefined;
};

/** The v3 PATCH's action_parameters, with tag removals before additions. */
export const buildAlertActions = (input: UpdateAlertInput) => {
  const actions: Array<{ name: string; value: string }> = [];
  if (input.status) actions.push({ name: 'update_status', value: input.status });
  if (input.comment) actions.push({ name: 'append_comment', value: input.comment });
  if (input.assign_to) {
    const name = UUID_PATTERN.test(input.assign_to)
      ? 'assign_to_uuid'
      : input.assign_to.includes('@')
      ? 'assign_to_user_id'
      : 'assign_to_name';
    actions.push({ name, value: input.assign_to });
  }
  if (input.unassign) actions.push({ name: 'unassign', value: '' });
  for (const tag of input.remove_tags ?? []) actions.push({ name: 'remove_tag', value: tag });
  if (input.remove_tags_by_prefix) {
    actions.push({ name: 'remove_tags_by_prefix', value: input.remove_tags_by_prefix });
  }
  for (const tag of input.add_tags ?? []) actions.push({ name: 'add_tag', value: tag });
  if (input.show_in_ui !== undefined) {
    actions.push({ name: 'show_in_ui', value: String(input.show_in_ui) });
  }
  return actions;
};

export const alertAndIocActions: ConnectorSpec['actions'] = {
  searchAlerts: {
    isTool: true,
    scope: 'read',
    description:
      'Search Falcon alerts by status, severity_min, host, time range, free text or an FQL filter. Returns composite alert ids and next_offset; paging stops at 10,000 results.',
    input: SearchAlertsInputSchema,
    handler: async (ctx, input: SearchAlertsInput) =>
      offsetPage(ctx, {
        path: '/alerts/queries/alerts/v2',
        params: {
          filter: buildAlertFilter(input),
          q: input.q,
          sort: input.sort ?? 'created_timestamp.desc',
          limit: input.limit,
          offset: input.offset,
          include_hidden: input.include_hidden,
        },
        scope: SCOPES.alertsRead,
        window: ALERTS_RESULT_WINDOW,
      }),
  },
  getAlertDetails: {
    isTool: true,
    scope: 'read',
    description:
      'Get alerts by composite id: severity, status, tactic, technique, process, file, host (device.device_id) and console link. Unknown ids are listed in errors.',
    input: GetAlertDetailsInputSchema,
    handler: async (ctx, input: GetAlertDetailsInput) => {
      const response = await falconRequest(ctx, {
        method: 'POST',
        path: '/alerts/entities/alerts/v2',
        params: { include_hidden: input.include_hidden },
        data: { composite_ids: input.composite_ids },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.alertsRead,
      });
      return lookupResult(response);
    },
  },
  updateAlert: {
    isTool: true,
    scope: 'destroy',
    description:
      'Update alerts: status, comment, assignee, tags or console visibility. Comments cannot be removed. Returns updated_ids and failures.',
    input: UpdateAlertInputSchema,
    handler: async (ctx, input: UpdateAlertInput) => {
      const response = await falconRequest(ctx, {
        method: 'PATCH',
        path: '/alerts/entities/alerts/v3',
        data: { composite_ids: input.composite_ids, action_parameters: buildAlertActions(input) },
        retryServerErrors: false,
        scope: SCOPES.alertsWrite,
      });
      const failures = errorsOf(response.data);
      const failed = (id: string) => failures.some((failure) => names(failure, id));
      const unattributed = failures.some(
        (failure) => !input.composite_ids.some((id) => names(failure, id))
      );
      const writes = response.data?.writes as { resources_affected?: number } | undefined;
      const reported = resourcesOf(response.data).filter(
        (id): id is string => typeof id === 'string'
      );
      let updatedIds = reported;
      if (reported.length === 0 && !unattributed) {
        updatedIds = input.composite_ids.filter((id) => !failed(id));
      }
      return {
        updated_ids: updatedIds,
        failures,
        resources_affected: writes?.resources_affected,
        meta: response.data?.meta,
      };
    },
  },
  ...caseActions,
  uploadIOC: {
    isTool: false,
    scope: 'write',
    description:
      'Create custom IOCs (sha256, md5, domain, ipv4, ipv6) with an action, platforms and severity. Returns the created IOCs with their ids and per-item errors.',
    input: UploadIOCInputSchema,
    handler: async (ctx, input: UploadIOCInput) => {
      const response = await falconRequest(ctx, {
        method: 'POST',
        path: '/iocs/entities/indicators/v1',
        params: { retrodetects: input.retrodetects, ignore_warnings: input.ignore_warnings },
        data: {
          indicators: input.indicators.map((indicator) => ({
            ...indicator,
            value: normalizeIndicator(indicator.type, indicator.value),
            applied_globally: indicator.applied_globally ?? !indicator.host_groups?.length,
          })),
        },
        retryServerErrors: false,
        scope: SCOPES.iocWrite,
      });
      return {
        resources: resourcesOf(response.data),
        errors: errorsOf(response.data),
        meta: response.data?.meta,
      };
    },
  },
  searchIOCs: {
    isTool: true,
    scope: 'read',
    description:
      "Search custom IOCs by FQL, for example type:'sha256'+value:'<hash>'. Returns the IOCs, next_offset, and next_after for results beyond 10,000.",
    input: SearchIOCsInputSchema,
    handler: async (ctx, input: SearchIOCsInput) => {
      const page = await offsetPage(ctx, {
        path: '/iocs/combined/indicator/v1',
        params: {
          filter: input.filter,
          limit: input.limit,
          offset: input.offset,
          after: input.after,
          sort: input.sort,
        },
        scope: SCOPES.iocRead,
        window: 10_000,
      });
      return {
        ...page,
        next_offset: input.after ? null : page.next_offset,
        next_after: nextAfter({ meta: page.meta }, page.resources.length),
      };
    },
  },
  deleteIOC: {
    isTool: false,
    scope: 'destroy',
    description: 'Delete custom IOCs by id. Returns outcomes per id: requested or notFound.',
    input: DeleteIOCInputSchema,
    handler: async (ctx, input: DeleteIOCInput) => {
      const response = await falconRequest(ctx, {
        method: 'DELETE',
        path: '/iocs/entities/indicators/v1',
        params: { ids: input.ids, comment: input.comment },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.iocWrite,
      });
      const resources = resourcesOf(response.data);
      const errors = errorsOf(response.data);
      // Falcon answers 404 when none of the ids exists: nothing left to delete is not a failure.
      if (response.status === 404 && resources.length === 0) {
        return {
          resources,
          errors,
          meta: response.data?.meta,
          outcomes: input.ids.map((id) => ({ id, status: 'notFound' as const })),
        };
      }
      return {
        resources,
        errors,
        meta: response.data?.meta,
        outcomes: sentOutcomes(input.ids, errors),
      };
    },
  },
  findHostsByIndicator: {
    isTool: true,
    scope: 'read',
    description:
      'Find the hosts that observed a sha256, md5, domain, ipv4 or ipv6 indicator. Returns device ids, device_count and next_offset (a cursor: pass it as offset for the next page).',
    input: FindHostsByIndicatorInputSchema,
    handler: async (ctx, input: FindHostsByIndicatorInput) => {
      const value = normalizeIndicator(input.type, input.value);
      // This route pages with an opaque cursor in meta.pagination.offset (for example
      // "0:1450837263") and ignores a numeric offset, so the cursor is passed through as is.
      const response = await falconRequest(ctx, {
        method: 'GET',
        path: '/iocs/queries/indicators/devices/v1',
        params: { type: input.type, value, limit: input.limit, offset: input.offset },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.iocHostsRead,
      });
      const resources = response.status === 404 ? [] : resourcesOf(response.data);
      const meta = response.data?.meta;
      const cursor = meta?.pagination?.offset;
      const page = {
        resources,
        meta,
        errors: errorsOf(response.data),
        next_offset:
          resources.length > 0 && typeof cursor === 'string' && cursor && cursor !== input.offset
            ? cursor
            : null,
      };
      const total = meta?.pagination?.total;
      // An empty page after the last one does not mean no host saw the indicator: only short-cut
      // when Falcon reports no hosts at all (total 0, or an empty first page without a total).
      if (resources.length === 0 && (total === 0 || (typeof total !== 'number' && !input.offset))) {
        return { ...page, device_count: 0, next_offset: null };
      }
      let deviceCount: unknown;
      try {
        const count = await falconRequest(ctx, {
          method: 'GET',
          path: '/iocs/aggregates/indicators/device-count/v1',
          params: { type: input.type, value },
          retryServerErrors: true,
          scope: SCOPES.iocHostsRead,
        });
        deviceCount = resourcesOf<{ device_count?: number }>(count.data)[0]?.device_count;
      } catch (error) {
        ctx.log.debug(`Falcon device count lookup failed: ${(error as Error).message}`);
      }
      return {
        ...page,
        device_count:
          typeof deviceCount === 'number'
            ? deviceCount
            : typeof total === 'number'
            ? total
            : resources.length,
      };
    },
  },
};
