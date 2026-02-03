/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Event status enum for Datadog Events API v2
 * @see https://docs.datadoghq.com/api/latest/events/#search-events
 */
export const datadogEventStatusEnum = z.enum([
  'failure',
  'error',
  'warning',
  'info',
  'success',
  'user_update',
  'recommendation',
  'snapshot',
]);

/**
 * Schema for the nested monitor object within event attributes
 * @see https://docs.datadoghq.com/api/latest/events/#search-events
 */
export const datadogEventMonitorSchema = z.object({
  /** Monitor group status (when no result_groups) */
  group_status: z.number().optional(),
  /** Groups to which the monitor belongs */
  groups: z.array(z.string()).optional(),
  /** Monitor ID */
  id: z.number().optional(),
  /** Monitor message */
  message: z.string().optional(),
  /** Monitor name */
  name: z.string().optional(),
  /** Monitor transition state */
  transition: z
    .object({
      destination_state: z.string().optional(),
      source_state: z.string().optional(),
      transition_type: z.string().optional(),
    })
    .optional(),
  /** Monitor result with URLs */
  result: z
    .object({
      alert_url: z.string().optional(),
      logs_url: z.string().optional(),
      group_key: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for Datadog alert event (Events API v2) - Flattened
 *
 * Based on Datadog Events API v2 response structure.
 * Documentation: https://docs.datadoghq.com/api/latest/events/#search-events
 *
 * The v2 API has a nested structure: data[].attributes.attributes.{field}
 * This schema represents the parsed/flattened structure returned by the connector.
 *
 * @see https://docs.datadoghq.com/api/latest/events/#search-events
 */
export const datadogAlertEventSchema = z.object({
  /**
   * Alert ID - unique alphanumeric identifier (v2 uses string IDs)
   */
  id: z.string().describe('Unique alphanumeric identifier for the event.'),

  /**
   * Aggregation key unique per monitor and group
   */
  aggregationKey: z.string().optional().describe('Aggregation key of the event.'),

  /**
   * Timestamp (ISO-8601 from attributes.timestamp)
   */
  timestamp: z.string().describe('ISO-8601 timestamp of the event.'),

  /**
   * Duration of the event in milliseconds.
   */
  duration: z.number().describe('Duration of the event in milliseconds.'),

  /**
   * Alert title (from attributes.attributes.title or attributes.attributes.event_object)
   */
  title: z.string().describe('Title of the event.'),

  /**
   * Alert message (from attributes.message)
   */
  message: z.string().describe('Message content of the event.'),

  /**
   * Tags (from attributes.tags)
   */
  tags: z.array(z.string()).default([]).describe('Tags associated with the event.'),

  /**
   * Status of the alert event
   * Values: failure, error, warning, info, success, user_update, recommendation, snapshot
   */
  status: z
    .string()
    .optional()
    .describe('Alert status (failure, error, warning, info, success, etc).'),

  /**
   * Priority of the event
   */
  priority: z.string().optional().describe('Event priority (normal or low).'),

  /**
   * Monitor groups
   */
  monitorGroups: z.array(z.string()).default([]).describe('Monitor groups for the event.'),

  /**
   * Monitor details
   */
  monitor: datadogEventMonitorSchema.optional().describe('Monitor that triggered this event.'),

  /**
   * Raw event data from Datadog.
   */
  rawEvent: z.any().describe('Raw event data from Datadog.'),
});

/**
 * Schema for Datadog external alert request (Events API v2)
 *
 * This represents the configuration needed to fetch alerts from Datadog.
 * Used to configure time ranges, filters, and pagination for querying Datadog Events API v2.
 *
 * @see https://docs.datadoghq.com/api/latest/events/#search-events for API parameters
 */
export const datadogAlertEventsRequestSchema = z.object({
  /**
   * Time range configuration - either explicit start/end or lookback window
   * v2 API uses milliseconds or ISO-8601 timestamps
   */
  timeRange: z
    .union([
      z.object({
        from: z.number().describe('Start timestamp (Unix epoch in milliseconds).'),
        to: z.number().describe('End timestamp (Unix epoch in milliseconds).'),
      }),
      z.object({
        lookbackWindow: z
          .string()
          .describe(
            'Lookback window in duration format (e.g., "15m" for 15 minutes, "1h" for 1 hour, "2d" for 2 days). Uses kbn-datemath units: ms, s, m, h, d, w, M, y.'
          ),
      }),
    ])
    .describe(
      'Time range for fetching alerts. Either specify start and end time (milliseconds) or a lookback window.'
    ),

  /**
   * Additional filter query to append to the base alert filter.
   * The connector always filters by `source:alert` - this field allows adding extra filters.
   * Example: "tag:production" would result in "source:alert tag:production"
   */
  additionalQuery: z
    .string()
    .optional()
    .describe(
      'Additional filter query to append to the base alert filter (e.g., "tag:production", "host:myhost"). The action always includes "source:alert".'
    ),

  /**
   * Page limit (max 1000)
   */
  pageLimit: z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(500)
    .describe('Number of events per page (max 1000). Defaults to 500.'),

  /**
   * Pagination cursor for fetching next page
   */
  pageCursor: z.string().optional().describe('Cursor for pagination (from previous response).'),

  /**
   * Sort order
   */
  sort: z
    .enum(['timestamp', '-timestamp'])
    .optional()
    .default('-timestamp')
    .describe(
      'Sort order. Use "-timestamp" for descending (newest first). Defaults to "-timestamp".'
    ),
});

/**
 * Schema for Datadog external alert response (Events API v2)
 *
 * This represents the response structure from the getAlertEvents action in the Datadog connector.
 * The response contains an array of parsed alert events, a total count, and pagination cursor.
 *
 * @see datadogAlertEventSchema for the structure of individual events
 */
export const datadogAlertEventsResponseSchema = z.object({
  /**
   * Array of parsed alert events
   */
  events: z
    .array(datadogAlertEventSchema)
    .default([])
    .describe('Array of parsed Datadog alert events.'),

  /**
   * Total number of events returned in this page
   */
  total: z.number().describe('Total number of alert events returned in this response.'),

  /**
   * Pagination cursor for next page (from meta.page.after)
   */
  nextCursor: z.string().optional().describe('Cursor for fetching the next page of results.'),
});

/**
 * Schema for Datadog monitors request (Monitors API v1)
 *
 * This represents the configuration needed to list monitors from Datadog.
 *
 * @see https://docs.datadoghq.com/api/latest/monitors/#get-all-monitor-details
 */
export const datadogMonitorsRequestSchema = z.object({
  /**
   * Comma-separated list of tags to filter by
   */
  tags: z.string().optional().describe('Comma-separated list of tags to filter by.'),

  /**
   * Comma-separated list of monitor tags
   */
  monitorTags: z.string().optional().describe('Comma-separated list of monitor tags.'),

  /**
   * Filter by monitor name
   */
  name: z.string().optional().describe('Filter by monitor name.'),

  /**
   * Page number (0-indexed)
   */
  page: z.number().optional().describe('Page number (0-indexed).'),

  /**
   * Number of monitors per page (max 1000)
   */
  pageSize: z.number().optional().describe('Number of monitors per page (max 1000).'),

  /**
   * Include downtime information for mute status
   */
  withDowntimes: z.boolean().optional().describe('Include downtime information for mute status.'),
});

/**
 * Schema for Datadog monitor
 *
 * Based on Datadog Monitors API v1 response structure.
 * Documentation: https://docs.datadoghq.com/api/latest/monitors/#get-all-monitor-details
 *
 * This schema matches the parsed structure returned by the listMonitors action in the Datadog connector.
 *
 * @see https://docs.datadoghq.com/api/latest/monitors/#get-all-monitor-details
 */
export const datadogMonitorSchema = z.object({
  /**
   * Monitor ID
   */
  id: z.number().describe('Unique identifier for the Datadog monitor.'),

  /**
   * Monitor name
   */
  name: z.string().describe('Name of the monitor.'),

  /**
   * Monitor type
   */
  type: z
    .string()
    .describe('Type of monitor (e.g., "metric alert", "service check", "event alert").'),

  /**
   * Monitor query
   */
  query: z.string().optional().describe('Query string that defines the monitor.'),

  /**
   * Monitor message
   */
  message: z.string().optional().describe('Message template for the monitor.'),

  /**
   * Monitor tags
   */
  tags: z.array(z.string()).default([]).describe('Array of tags associated with the monitor.'),

  /**
   * Monitor overall state
   */
  overallState: z.string().optional().describe('Current overall state of the monitor.'),

  /**
   * Monitor priority (P1-P4 or 1-4)
   */
  priority: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Priority level of the monitor (P1-P4 or 1-4).'),

  /**
   * Monitor options
   */
  options: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional options and configuration for the monitor.'),

  /**
   * Monitor created timestamp
   */
  created: z.string().optional().describe('ISO timestamp when the monitor was created.'),

  /**
   * Monitor modified timestamp
   */
  modified: z.string().optional().describe('ISO timestamp when the monitor was last modified.'),

  /**
   * Monitor creator information
   */
  creator: z
    .object({
      id: z.number().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
      handle: z.string().optional(),
    })
    .optional(),

  /**
   * Matching downtimes (for mute status)
   */
  matchingDowntimes: z.array(z.any()).optional().describe('Downtimes affecting this monitor.'),
  rawMonitor: z.any().describe('Raw monitor data from Datadog.'),
});

/**
 * Schema for Datadog monitors response (Monitors API v1)
 *
 * This represents the response structure from the listMonitors action in the Datadog connector.
 *
 * @see https://docs.datadoghq.com/api/latest/monitors/#get-all-monitor-details
 */
export const datadogMonitorsResponseSchema = z.object({
  /**
   * Array of monitors
   */
  monitors: z.array(datadogMonitorSchema).default([]).describe('Array of Datadog monitors.'),

  /**
   * Total number of monitors returned
   */
  total: z.number().describe('Total number of monitors returned.'),
});
