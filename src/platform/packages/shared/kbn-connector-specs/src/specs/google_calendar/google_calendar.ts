/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

// Google Calendar API constants
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_MAX_RESULTS = 50;
const MAX_RESULTS_LIMIT = 2500;

/**
 * Extracts and throws a meaningful error from Google Calendar API responses.
 */
function throwGoogleCalendarError(error: unknown): void {
  const axiosError = error as {
    response?: { data?: { error?: { message?: string; code?: number } } };
  };
  const googleError = axiosError.response?.data?.error;
  if (googleError) {
    throw new Error(`Google Calendar API error (${googleError.code}): ${googleError.message}`);
  }
}

export const GoogleCalendar: ConnectorSpec = {
  metadata: {
    id: '.google_calendar',
    displayName: 'Google Calendar',
    description: i18n.translate('core.kibanaConnectorSpecs.googleCalendar.metadata.description', {
      defaultMessage: 'Search and access events and calendars in Google Calendar',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: ['bearer'],
    headers: {
      Accept: 'application/json',
    },
  },

  actions: {
    searchEvents: {
      isTool: true,
      input: z.object({
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
          .default(DEFAULT_MAX_RESULTS)
          .describe('Maximum number of events to return (1-2500, default 50)'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          calendarId: string;
          timeMin?: string;
          timeMax?: string;
          maxResults: number;
        };

        const calendarId = encodeURIComponent(typedInput.calendarId || 'primary');
        const params: Record<string, string | number | boolean> = {
          q: typedInput.query,
          maxResults: Math.min(typedInput.maxResults || DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT),
          singleEvents: true,
          orderBy: 'startTime',
        };

        if (typedInput.timeMin) {
          params.timeMin = typedInput.timeMin;
        }
        if (typedInput.timeMax) {
          params.timeMax = typedInput.timeMax;
        }

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
            { params }
          );

          const events = (response.data.items || []).map(
            (event: {
              id: string;
              summary?: string;
              description?: string;
              location?: string;
              start?: { dateTime?: string; date?: string };
              end?: { dateTime?: string; date?: string };
              status?: string;
              htmlLink?: string;
              organizer?: { email?: string; displayName?: string };
              attendees?: Array<{
                email?: string;
                displayName?: string;
                responseStatus?: string;
              }>;
              created?: string;
              updated?: string;
            }) => ({
              id: event.id,
              summary: event.summary,
              description: event.description,
              location: event.location,
              start: event.start,
              end: event.end,
              status: event.status,
              htmlLink: event.htmlLink,
              organizer: event.organizer,
              attendees: event.attendees,
              created: event.created,
              updated: event.updated,
            })
          );

          return {
            events,
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGoogleCalendarError(error);
          throw error;
        }
      },
    },

    getEvent: {
      isTool: true,
      input: z.object({
        eventId: z.string().min(1).describe('The ID of the event to retrieve'),
        calendarId: z
          .preprocess((val) => (val === '' ? undefined : val), z.string().optional())
          .default('primary')
          .describe(
            "Calendar ID containing the event. Use 'primary' for the user's primary calendar."
          ),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          eventId: string;
          calendarId: string;
        };

        const calendarId = encodeURIComponent(typedInput.calendarId || 'primary');
        const eventId = encodeURIComponent(typedInput.eventId);

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`
          );

          const event = response.data;
          return {
            id: event.id,
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
            status: event.status,
            htmlLink: event.htmlLink,
            organizer: event.organizer,
            creator: event.creator,
            attendees: event.attendees,
            recurrence: event.recurrence,
            recurringEventId: event.recurringEventId,
            conferenceData: event.conferenceData,
            hangoutLink: event.hangoutLink,
            attachments: event.attachments,
            created: event.created,
            updated: event.updated,
          };
        } catch (error: unknown) {
          throwGoogleCalendarError(error);
          throw error;
        }
      },
    },

    listCalendars: {
      isTool: true,
      input: z.object({
        pageToken: z.string().optional().describe('Token for pagination'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          pageToken?: string;
        };

        const params: Record<string, string> = {};
        if (typedInput.pageToken) {
          params.pageToken = typedInput.pageToken;
        }

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`,
            { params }
          );

          const calendars = (response.data.items || []).map(
            (cal: {
              id: string;
              summary?: string;
              description?: string;
              primary?: boolean;
              accessRole?: string;
              timeZone?: string;
              backgroundColor?: string;
            }) => ({
              id: cal.id,
              summary: cal.summary,
              description: cal.description,
              primary: cal.primary,
              accessRole: cal.accessRole,
              timeZone: cal.timeZone,
            })
          );

          return {
            calendars,
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGoogleCalendarError(error);
          throw error;
        }
      },
    },

    listEvents: {
      isTool: true,
      input: z.object({
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
          .default(DEFAULT_MAX_RESULTS)
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
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          calendarId: string;
          timeMin?: string;
          timeMax?: string;
          maxResults: number;
          pageToken?: string;
          orderBy?: string;
        };

        const calendarId = encodeURIComponent(typedInput.calendarId || 'primary');
        const params: Record<string, string | number | boolean> = {
          maxResults: Math.min(typedInput.maxResults || DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT),
          singleEvents: true,
          orderBy: typedInput.orderBy || 'startTime',
        };

        if (typedInput.timeMin) {
          params.timeMin = typedInput.timeMin;
        }
        if (typedInput.timeMax) {
          params.timeMax = typedInput.timeMax;
        }
        if (typedInput.pageToken) {
          params.pageToken = typedInput.pageToken;
        }

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
            { params }
          );

          const events = (response.data.items || []).map(
            (event: {
              id: string;
              summary?: string;
              description?: string;
              location?: string;
              start?: { dateTime?: string; date?: string };
              end?: { dateTime?: string; date?: string };
              status?: string;
              htmlLink?: string;
              organizer?: { email?: string; displayName?: string };
              attendees?: Array<{
                email?: string;
                displayName?: string;
                responseStatus?: string;
              }>;
              created?: string;
              updated?: string;
            }) => ({
              id: event.id,
              summary: event.summary,
              description: event.description,
              location: event.location,
              start: event.start,
              end: event.end,
              status: event.status,
              htmlLink: event.htmlLink,
              organizer: event.organizer,
              attendees: event.attendees,
              created: event.created,
              updated: event.updated,
            })
          );

          return {
            events,
            nextPageToken: response.data.nextPageToken,
          };
        } catch (error: unknown) {
          throwGoogleCalendarError(error);
          throw error;
        }
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.googleCalendar.test.description', {
      defaultMessage: 'Verifies Google Calendar connection by fetching calendar list',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Google Calendar test handler');
      try {
        const response = await ctx.client.get(
          `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`,
          {
            params: {
              maxResults: 1,
            },
          }
        );

        if (response.status !== 200) {
          return { ok: false, message: 'Failed to connect to Google Calendar API' };
        }

        return {
          ok: true,
          message: 'Successfully connected to Google Calendar API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect to Google Calendar API: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        };
      }
    },
  },
};
