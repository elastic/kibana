/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Shared types
// =============================================================================

export interface CalendarListItemShape {
  id: string;
  summary?: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  timeZone?: string;
}

export interface CalendarEventShape {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  htmlLink?: string;
  organizer?: { email?: string; displayName?: string };
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  created?: string;
  updated?: string;
}

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const SearchEventsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Free text search terms to find events that match in summary, description, location, ' +
        "attendee names, or other fields. Examples: 'team standup', 'budget review', 'John Smith'."
    ),
  calendarId: z
    .preprocess((val) => (val === '' ? undefined : val), z.string().optional())
    .default('primary')
    .describe(
      "Calendar ID to search. Use 'primary' for the user's primary calendar, or a specific calendar ID from listCalendars."
    ),
  timeMin: z
    .string()
    .optional()
    .describe(
      'Lower bound (inclusive) for event start time, as an RFC3339 timestamp. Example: 2024-01-01T00:00:00Z'
    ),
  timeMax: z
    .string()
    .optional()
    .describe(
      'Upper bound (exclusive) for event start time, as an RFC3339 timestamp. Example: 2024-12-31T23:59:59Z'
    ),
  maxResults: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of events to return (1-2500, default 50)'),
  orderBy: z
    .preprocess(
      (val) => (val === '' ? undefined : val),
      z.enum(['startTime', 'updated']).optional()
    )
    .describe(
      "Sort order: 'startTime' (chronological, default) or 'updated' (last modification time)"
    ),
});
export type SearchEventsInput = z.infer<typeof SearchEventsInputSchema>;

export const GetEventInputSchema = z.object({
  eventId: z.string().min(1).describe('The ID of the event to retrieve'),
  calendarId: z
    .preprocess((val) => (val === '' ? undefined : val), z.string().optional())
    .default('primary')
    .describe("Calendar ID containing the event. Use 'primary' for the user's primary calendar."),
});
export type GetEventInput = z.infer<typeof GetEventInputSchema>;

export const ListCalendarsInputSchema = z.object({
  pageToken: z.string().optional().describe('Token for pagination'),
});
export type ListCalendarsInput = z.infer<typeof ListCalendarsInputSchema>;

export const ListEventsInputSchema = z.object({
  calendarId: z
    .preprocess((val) => (val === '' ? undefined : val), z.string().optional())
    .default('primary')
    .describe(
      "Calendar ID to list events from. Use 'primary' for the user's primary calendar, or a specific calendar ID from listCalendars."
    ),
  timeMin: z
    .string()
    .optional()
    .describe(
      'Lower bound (inclusive) for event start time, as an RFC3339 timestamp. Example: 2024-01-01T00:00:00Z'
    ),
  timeMax: z
    .string()
    .optional()
    .describe(
      'Upper bound (exclusive) for event start time, as an RFC3339 timestamp. Example: 2024-12-31T23:59:59Z'
    ),
  maxResults: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of events to return (1-2500, default 50)'),
  pageToken: z.string().optional().describe('Token for pagination'),
  orderBy: z
    .preprocess(
      (val) => (val === '' ? undefined : val),
      z.enum(['startTime', 'updated']).optional()
    )
    .describe(
      "Sort order: 'startTime' (chronological, requires singleEvents=true) or 'updated' (last modification time)"
    ),
});
export type ListEventsInput = z.infer<typeof ListEventsInputSchema>;
