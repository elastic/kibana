/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';
import {
  SearchEventsInputSchema,
  GetEventInputSchema,
  ListCalendarsInputSchema,
  ListEventsInputSchema,
  FreeBusyInputSchema,
} from './types';
import type {
  SearchEventsInput,
  GetEventInput,
  ListCalendarsInput,
  ListEventsInput,
  FreeBusyInput,
} from './types';
import freeBusyWorkflow from './workflows/free_busy.yaml';
import getEventWorkflow from './workflows/get_event.yaml';
import listCalendarsWorkflow from './workflows/list_calendars.yaml';
import listEventsWorkflow from './workflows/list_events.yaml';
import searchWorkflow from './workflows/search.yaml';

// Google Calendar API constants
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_MAX_RESULTS = 50;
const MAX_RESULTS_LIMIT = 2500;

function rethrowGoogleCalendarError(error: unknown): void {
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
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },
  auth: {
    types: [
      'bearer',
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
        },
      },
    ],
    headers: {
      Accept: 'application/json',
    },
  },

  actions: {
    searchEvents: {
      isTool: true,
      input: SearchEventsInputSchema,
      handler: async (ctx, input: SearchEventsInput) => {
        const calendarId = encodeURIComponent(input.calendarId || 'primary');
        const params: Record<string, string | number | boolean> = {
          q: input.query,
          maxResults: Math.min(input.maxResults || DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT),
          singleEvents: true,
          orderBy: input.orderBy || 'startTime',
          timeMin: input.timeMin || new Date().toISOString(),
        };

        if (input.timeMax) {
          params.timeMax = input.timeMax;
        }

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
            { params }
          );

          return response.data;
        } catch (error: unknown) {
          rethrowGoogleCalendarError(error);
          throw error;
        }
      },
    },

    getEvent: {
      isTool: true,
      input: GetEventInputSchema,
      handler: async (ctx, input: GetEventInput) => {
        const calendarId = encodeURIComponent(input.calendarId || 'primary');
        const eventId = encodeURIComponent(input.eventId);

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`
          );

          return response.data;
        } catch (error: unknown) {
          rethrowGoogleCalendarError(error);
          throw error;
        }
      },
    },

    listCalendars: {
      isTool: true,
      input: ListCalendarsInputSchema,
      handler: async (ctx, input: ListCalendarsInput) => {
        const params: Record<string, string> = {};
        if (input.pageToken) {
          params.pageToken = input.pageToken;
        }

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`,
            { params }
          );

          return response.data;
        } catch (error: unknown) {
          rethrowGoogleCalendarError(error);
          throw error;
        }
      },
    },

    listEvents: {
      isTool: true,
      input: ListEventsInputSchema,
      handler: async (ctx, input: ListEventsInput) => {
        const calendarId = encodeURIComponent(input.calendarId || 'primary');
        const params: Record<string, string | number | boolean> = {
          maxResults: Math.min(input.maxResults || DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT),
          singleEvents: true,
          orderBy: input.orderBy || 'startTime',
        };

        if (input.timeMin) {
          params.timeMin = input.timeMin;
        }
        if (input.timeMax) {
          params.timeMax = input.timeMax;
        }
        if (input.pageToken) {
          params.pageToken = input.pageToken;
        }

        try {
          const response = await ctx.client.get(
            `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
            { params }
          );

          return response.data;
        } catch (error: unknown) {
          rethrowGoogleCalendarError(error);
          throw error;
        }
      },
    },

    freeBusy: {
      isTool: true,
      input: FreeBusyInputSchema,
      handler: async (ctx, input: FreeBusyInput) => {
        const body: Record<string, unknown> = {
          timeMin: input.timeMin,
          timeMax: input.timeMax,
          items: input.calendarIds.map((id) => ({ id })),
        };

        if (input.timeZone) {
          body.timeZone = input.timeZone;
        }

        try {
          const response = await ctx.client.post(`${GOOGLE_CALENDAR_API_BASE}/freeBusy`, body);

          return response.data;
        } catch (error: unknown) {
          rethrowGoogleCalendarError(error);
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
      try {
        const response = await ctx.client.get(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`, {
          params: {
            maxResults: 1,
          },
        });

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

  agentBuilderWorkflows: [
    freeBusyWorkflow,
    getEventWorkflow,
    listCalendarsWorkflow,
    listEventsWorkflow,
    searchWorkflow,
  ],
};
