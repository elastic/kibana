/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Datadog Connector
 *
 * This connector enables integration with Datadog to:
 * - List monitors from Datadog (v1 API)
 * - Fetch alert events from Datadog Events API (v2 API)
 *
 * Authentication:
 * - API Key + Application Key (both required for Datadog API operations)
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type {
  DatadogAlertEvent,
  DatadogMonitor,
  DatadogAlertEventsResponse,
  DatadogMonitorsResponse,
  DatadogMonitorsRequest,
} from '@kbn/alerting-v2-external-alerts-schema';
import {
  datadogAlertEventsResponseSchema,
  datadogAlertEventsRequestSchema,
  datadogMonitorsRequestSchema,
  datadogMonitorsResponseSchema,
} from '@kbn/alerting-v2-external-alerts-schema';
import dateMath from '@kbn/datemath';
import type { ConnectorSpec } from '../../connector_spec';

/**
 * Parse a duration string (e.g., "15m", "1h", "2d") into millisecond timestamps
 * Uses dateMath.parse('now-{duration}') pattern from kbn-infra-forge
 *
 * Supports all kbn-datemath units: ms, s, m, h, d, w, M, y
 * Returns timestamps in milliseconds for v2 API compatibility
 */
function parseWindowToStartAndEnd(window: string): { start: number; end: number } {
  const now = Date.now();

  // Use dateMath.parse to compute the timestamp of 'now - duration'
  // This handles all supported units (ms, s, m, h, d, w, M, y)
  const startTs = dateMath.parse(`now-${window}`);

  if (!startTs || !startTs.isValid()) {
    throw new Error(
      `Invalid duration "${window}". Expected format like "5m", "1h", "2d". ` +
        `Supported units: ${dateMath.units.join(', ')}`
    );
  }

  // v2 API uses milliseconds
  return {
    start: startTs.valueOf(),
    end: now,
  };
}

/**
 * Datadog site options
 *
 * This list contains all available Datadog sites/regions.
 * Reference: https://docs.datadoghq.com/getting_started/site/
 *
 * IMPORTANT: If Datadog introduces a new site, this list must be updated
 * to include it. Users will not be able to use new sites until this enum
 * is updated and the connector is redeployed.
 *
 * Current sites as of last update:
 * - datadoghq.com (US1) - Default US site
 * - us3.datadoghq.com (US3) - US3 region
 * - us5.datadoghq.com (US5) - US5 region
 * - datadoghq.eu (EU1) - European Union site
 * - ap1.datadoghq.com (AP1) - Asia Pacific region
 * - ddog-gov.com (US1-FED) - US Federal Government site
 */
const DATADOG_SITES = [
  'datadoghq.com', // US1
  'us3.datadoghq.com', // US3
  'us5.datadoghq.com', // US5
  'datadoghq.eu', // EU1
  'ap1.datadoghq.com', // AP1
  'ddog-gov.com', // US1-FED
] as const;

/**
 * Interface for v2 API event structure
 */
interface DatadogV2Event {
  id: string;
  type: string;
  attributes: {
    tags: string[];
    message: string;
    attributes: {
      timestamp: string;
      status: string;
      aggregation_key: string;
      duration?: number;
      title: string;
      monitor_groups: string[];
      priority?: string;
      service?: string;
      monitor?: {
        name?: string;
        transition?: {
          destination_state?: string;
          source_state?: string;
          transition_type?: string;
        };
        id?: number;
        result?: {
          alert_url?: string;
          logs_url?: string;
          group_key?: string;
        };
      };
    };
  };
}

/**
 * Interface for v2 API response
 */
interface DatadogV2Response {
  data: DatadogV2Event[];
  meta?: {
    page?: {
      after?: string;
    };
  };
}

/**
 * Map a v2 API event to our flattened schema
 */
function mapAlertEvent(event: DatadogV2Event): DatadogAlertEvent {
  const attrs = event.attributes;
  const nested = attrs.attributes || {};
  const monitor = nested.monitor || {};

  return {
    id: event.id,
    aggregationKey: nested.aggregation_key,
    timestamp: nested.timestamp,
    duration: nested.duration || 0,
    title: nested.title,
    message: attrs.message,
    tags: attrs.tags || [],
    status: nested.status,
    priority: nested.priority,
    monitorGroups: nested.monitor_groups,
    monitor,
    rawEvent: event,
  };
}

export const DatadogConnector: ConnectorSpec = {
  metadata: {
    id: '.datadog',
    displayName: 'Datadog',
    description: i18n.translate('xpack.stackConnectors.datadog.metadata.description', {
      defaultMessage: 'Integrate with Datadog to list monitors and fetch alert events',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
    isExperimental: true,
  },

  // Authentication for outbound requests to Datadog API
  // Datadog requires both API Key and Application Key in headers
  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'DD-API-KEY' } }],
  },

  // Configuration schema
  schema: z.object({
    // Datadog site/region
    site: z
      .enum(DATADOG_SITES)
      .default('datadoghq.com')
      .meta({
        label: i18n.translate('xpack.stackConnectors.datadog.schema.site', {
          defaultMessage: 'Datadog Site',
        }),
      })
      .describe(
        i18n.translate('xpack.stackConnectors.datadog.schema.site', {
          defaultMessage: 'Datadog Site',
        })
      ),
    // Datadog Application Key (required for most API operations)
    appKey: z
      .string()
      .meta({
        label: i18n.translate('xpack.stackConnectors.datadog.schema.appKey', {
          defaultMessage: 'Application Key',
        }),
        helpText: i18n.translate('xpack.stackConnectors.datadog.schema.appKey.helpText', {
          defaultMessage:
            'Your Datadog Application Key. Required for accessing monitors and events.',
        }),
        sensitive: true,
        widget: 'password',
      })
      .describe(
        i18n.translate('xpack.stackConnectors.datadog.schema.appKey.description', {
          defaultMessage: 'Datadog Application Key for API authentication',
        })
      ),
  }),

  actions: {
    /**
     * List monitors from Datadog
     * https://docs.datadoghq.com/api/latest/monitors/#get-all-monitor-details
     */
    listMonitors: {
      isTool: true,
      input: datadogMonitorsRequestSchema,
      output: datadogMonitorsResponseSchema,
      handler: async (ctx, input): Promise<DatadogMonitorsResponse> => {
        const typedInput = datadogMonitorsRequestSchema.parse(input) as DatadogMonitorsRequest;
        const site = (ctx.config?.site as string) || 'datadoghq.com';
        const appKey = ctx.config?.appKey as string;

        const params: Record<string, unknown> = {};
        if (typedInput.tags) params.tags = typedInput.tags;
        if (typedInput.monitorTags) params.monitor_tags = typedInput.monitorTags;
        if (typedInput.name) params.name = typedInput.name;
        if (typedInput.page !== undefined) params.page = typedInput.page;
        if (typedInput.pageSize !== undefined) params.page_size = typedInput.pageSize;
        if (typedInput.withDowntimes) params.with_downtimes = typedInput.withDowntimes;

        const response = await ctx.client.get(`https://api.${site}/api/v1/monitor`, {
          params,
          headers: {
            'DD-APPLICATION-KEY': appKey,
          },
          maxContentLength: 5 * 1024 * 1024, // 5MB limit
        });

        const monitors: DatadogMonitor[] = response.data.map((m: Record<string, unknown>) => ({
          id: m.id as number,
          name: m.name as string,
          type: m.type as string,
          message: m.message as string | undefined,
          overallState: m.overall_state as string | undefined,
          tags: (m.tags || []) as string[],
          priority: m.priority as number | string | undefined,
          creator: m.creator as { id?: number; name?: string; email?: string } | undefined,
          matchingDowntimes: m.matching_downtimes as unknown[] | undefined,
          rawMonitor: m,
        }));

        return {
          monitors,
          total: monitors.length,
        };
      },
      description: i18n.translate(
        'xpack.stackConnectors.datadog.actions.listMonitors.description',
        {
          defaultMessage: 'List monitors from Datadog',
        }
      ),
    },

    /**
     * Get alert events from Datadog Events API v2
     * https://docs.datadoghq.com/api/latest/events/#search-events
     *
     * Key differences from v1:
     * - Endpoint: /api/v2/events/search instead of /api/v1/events
     * - Query params: filter[query], filter[from], filter[to] instead of sources, start, end
     * - Response: Nested structure with data[].attributes.attributes
     * - Pagination: Cursor-based via meta.page.after
     * - Timestamps: Milliseconds or ISO-8601 instead of seconds
     */
    getAlertEvents: {
      isTool: true,
      input: datadogAlertEventsRequestSchema,
      output: datadogAlertEventsResponseSchema,
      handler: async (ctx, input): Promise<DatadogAlertEventsResponse> => {
        const typedInput = datadogAlertEventsRequestSchema.parse(input);
        const site = (ctx.config?.site as string) || 'datadoghq.com';
        const appKey = ctx.config?.appKey as string;

        // Determine start and end based on timeRange type
        let filterFrom: string;
        let filterTo: string;

        if ('lookbackWindow' in typedInput.timeRange) {
          const range = parseWindowToStartAndEnd(typedInput.timeRange.lookbackWindow);
          // v2 API accepts ISO-8601 or milliseconds as string
          filterFrom = new Date(range.start).toISOString();
          filterTo = new Date(range.end).toISOString();
        } else {
          // Use provided start and end (convert milliseconds to ISO-8601)
          filterFrom = new Date(typedInput.timeRange.from).toISOString();
          filterTo = new Date(typedInput.timeRange.to).toISOString();
        }

        // Build filter query - always include source:alert, optionally append user filters
        const baseQuery = 'source:alert';
        const filterQuery = typedInput.additionalQuery
          ? `${baseQuery} ${typedInput.additionalQuery}`
          : baseQuery;

        // Build v2 API request body (POST with JSON body)
        // See: https://docs.datadoghq.com/api/latest/events/#search-events
        const requestBody: {
          filter: {
            query: string;
            from: string;
            to: string;
          };
          sort?: string;
          page?: {
            limit?: number;
            cursor?: string;
          };
        } = {
          filter: {
            query: filterQuery,
            from: filterFrom,
            to: filterTo,
          },
        };

        // Add sort order
        if (typedInput.sort) {
          requestBody.sort = typedInput.sort;
        }

        // Add pagination
        requestBody.page = {
          limit: typedInput.pageLimit,
        };

        // Add pagination cursor if provided
        if (typedInput.pageCursor) {
          requestBody.page.cursor = typedInput.pageCursor;
        }

        // Call v2 Events API (POST with JSON body)
        const response = await ctx.client.post<DatadogV2Response>(
          `https://api.${site}/api/v2/events/search`,
          requestBody,
          {
            headers: {
              'DD-APPLICATION-KEY': appKey,
            },
            maxContentLength: 5 * 1024 * 1024, // 5MB limit
          }
        );

        // Map v2 response to our schema
        const events: DatadogAlertEvent[] = (response.data.data || []).map(mapAlertEvent);

        // Extract pagination cursor
        const nextCursor = response.data.meta?.page?.after;

        return {
          events,
          total: events.length,
          nextCursor,
        };
      },
      description: i18n.translate(
        'xpack.stackConnectors.datadog.actions.getAlertEvents.description',
        {
          defaultMessage: 'Fetch alert events from Datadog Events API v2',
        }
      ),
    },
  },

  test: {
    description: i18n.translate('xpack.stackConnectors.datadog.test.description', {
      defaultMessage:
        'Verifies connection to Datadog API by validating credentials and checking permissions',
    }),
    handler: async (ctx) => {
      const site = (ctx.config?.site as string) || 'datadoghq.com';
      const appKey = ctx.config?.appKey as string;

      try {
        // Step 1: Validate API key
        const validateResponse = await ctx.client.get(`https://api.${site}/api/v1/validate`);

        if (!validateResponse.data.valid) {
          return {
            ok: false,
            message: i18n.translate('xpack.stackConnectors.datadog.test.invalidApiKey', {
              defaultMessage: 'Invalid API key',
            }),
          };
        }

        // Step 2: Check monitors_read scope by listing monitors
        try {
          await ctx.client.get(`https://api.${site}/api/v1/monitor`, {
            params: { page_size: 1 },
            headers: {
              'DD-APPLICATION-KEY': appKey,
            },
          });
        } catch (monitorError: unknown) {
          const err = monitorError as { response?: { status?: number } };
          if (err.response?.status === 403) {
            return {
              ok: false,
              message: i18n.translate('xpack.stackConnectors.datadog.test.noMonitorReadScope', {
                defaultMessage:
                  'API key is valid but missing monitors_read permission. Please ensure your Application Key has the required scopes.',
              }),
            };
          }
          throw monitorError;
        }

        // Step 3: Check events_read scope by querying events (v2 API - POST with body)
        try {
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 3600000);
          await ctx.client.post(
            `https://api.${site}/api/v2/events/search`,
            {
              filter: {
                from: oneHourAgo.toISOString(),
                to: now.toISOString(),
                query: 'source:alert',
              },
              page: {
                limit: 1,
              },
            },
            {
              headers: {
                'DD-APPLICATION-KEY': appKey,
              },
            }
          );
        } catch (eventsError: unknown) {
          const err = eventsError as { response?: { status?: number } };
          if (err.response?.status === 403) {
            return {
              ok: false,
              message: i18n.translate('xpack.stackConnectors.datadog.test.noEventsReadScope', {
                defaultMessage:
                  'API key is valid but missing events_read permission. Please ensure your Application Key has the required scopes.',
              }),
            };
          }
          throw eventsError;
        }

        const successMessage = i18n.translate('xpack.stackConnectors.datadog.test.successFull', {
          defaultMessage:
            'Successfully connected to Datadog API. All required permissions are available.',
        });

        return {
          ok: true,
          message: successMessage,
          details: {
            apiKeyValid: true,
            eventsApiVersion: 'v2',
          },
        };
      } catch (error: unknown) {
        const err = error as { response?: { status?: number; data?: { errors?: string[] } } };
        let errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (err.response?.status === 401) {
          errorMessage = 'Invalid API key';
        } else if (err.response?.status === 403) {
          errorMessage = 'Invalid Application key or insufficient permissions';
        } else if (err.response?.data?.errors) {
          errorMessage = err.response.data.errors.join(', ');
        }

        return {
          ok: false,
          message: i18n.translate('xpack.stackConnectors.datadog.test.failure', {
            defaultMessage: 'Failed to connect to Datadog API: {error}',
            values: { error: errorMessage },
          }),
        };
      }
    },
  },

  // Retry policy for Datadog API
  policies: {
    retry: {
      retryOnStatusCodes: [429, 500, 502, 503, 504],
      maxRetries: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
    },
    rateLimit: {
      strategy: 'header',
      remainingHeader: 'X-RateLimit-Remaining',
      resetHeader: 'X-RateLimit-Reset',
    },
  },
};
