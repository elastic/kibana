/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Zoom Connector
 *
 * Provides integration with Zoom via the Zoom REST API v2. Features include:
 * - Listing upcoming meetings
 * - Retrieving meeting details and past meeting summaries
 * - Retrieving meeting recordings (including transcripts and chat files)
 * - Downloading recording files (transcripts, chat logs, audio, video)
 * - Listing participants of past meetings
 * - Listing meeting registrants
 *
 * Auth: Bearer token (manual entry) until Kibana supports Zoom's S2S OAuth
 * (grant_type=account_credentials). Generate a token via:
 *   curl -X POST "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=ACCOUNT_ID" \
 *     -u "CLIENT_ID:CLIENT_SECRET"
 * Tokens expire after 1 hour.
 * See https://developers.zoom.us/docs/internal-apps/s2s-oauth/
 *
 * Required granular scopes on the Zoom S2S OAuth app:
 *   user:read:user:admin
 *   meeting:read:meeting:admin
 *   meeting:read:list_meetings:admin
 *   meeting:read:past_meeting:admin
 *   meeting:read:list_past_participants:admin
 *   meeting:read:list_registrants:admin
 *   cloud_recording:read:list_recording_files:admin
 *   cloud_recording:read:list_user_recordings:admin
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import type {
  AnyRecord,
  ZoomListMeetingsInput,
  ZoomGetMeetingDetailsInput,
  ZoomGetPastMeetingDetailsInput,
  ZoomGetMeetingRecordingsInput,
  ZoomListUserRecordingsInput,
  ZoomDownloadRecordingFileInput,
  ZoomGetMeetingParticipantsInput,
  ZoomGetMeetingRegistrantsInput,
} from './types';
import {
  ZOOM_DEFAULT_MAX_RECORDING_CONTENT_CHARS,
  ZoomPaginationOutputSchema,
  ZoomMeetingSummarySchema,
  ZoomRecordingFileSchema,
  ZoomParticipantSchema,
  ZoomRegistrantSchema,
  ZoomUserProfileSchema,
  ZoomWhoAmIInputSchema,
  ZoomListMeetingsInputSchema,
  ZoomGetMeetingDetailsInputSchema,
  ZoomGetPastMeetingDetailsInputSchema,
  ZoomGetMeetingRecordingsInputSchema,
  ZoomListUserRecordingsInputSchema,
  ZoomDownloadRecordingFileInputSchema,
  ZoomGetMeetingParticipantsInputSchema,
  ZoomGetMeetingRegistrantsInputSchema,
  pickMeetingSummary,
  pickRecordingFile,
  pickParticipant,
  pickRegistrant,
  pickUserProfile,
} from './types';

const ZOOM_API_BASE = 'https://api.zoom.us/v2';

/**
 * Zoom UUIDs that begin with `/` or contain `//` must be double-encoded
 * when used as path parameters. Plain numeric meeting IDs pass through unchanged.
 * See https://developers.zoom.us/docs/api/rest/using-zoom-apis/#meeting-id-and-uuid
 */
const encodeZoomId = (id: string): string => {
  const stripped = id.replace(/\s/g, '');
  return stripped.startsWith('/') || stripped.includes('//')
    ? encodeURIComponent(encodeURIComponent(stripped))
    : encodeURIComponent(stripped);
};

export const Zoom: ConnectorSpec = {
  metadata: {
    id: '.zoom',
    displayName: 'Zoom',
    description: i18n.translate('core.kibanaConnectorSpecs.zoom.metadata.description', {
      defaultMessage: 'Access meetings, recordings, transcripts, and participants in Zoom',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('core.kibanaConnectorSpecs.zoom.auth.token.label', {
                defaultMessage: 'Zoom access token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.zoom.auth.token.helpText', {
                defaultMessage:
                  'Paste a Zoom Server-to-Server OAuth access token. Generate one via the Zoom Marketplace or API. Tokens expire after 1 hour.',
              }),
            },
          },
        },
      },
    ],
  },

  actions: {
    whoAmI: {
      isTool: true,
      description: i18n.translate('core.kibanaConnectorSpecs.zoom.actions.whoAmI.description', {
        defaultMessage:
          'Get the profile of the currently authenticated Zoom user, including name, email, role, timezone, and personal meeting URL.',
      }),
      input: ZoomWhoAmIInputSchema,
      output: ZoomUserProfileSchema,
      handler: async (ctx) => {
        ctx.log.debug('Zoom whoAmI — fetching /users/me');
        const { data } = await ctx.client.get(`${ZOOM_API_BASE}/users/me`);
        return pickUserProfile(data);
      },
    },

    listMeetings: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.listMeetings.description',
        {
          defaultMessage: 'List meetings for a user. Use type=upcoming for future meetings.',
        }
      ),
      input: ZoomListMeetingsInputSchema,
      output: ZoomPaginationOutputSchema.extend({
        meetings: z.array(ZoomMeetingSummarySchema).describe('Array of meeting summaries'),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomListMeetingsInput = ZoomListMeetingsInputSchema.parse(input);
        ctx.log.debug(
          `Zoom listing meetings for user ${typedInput.userId}, type=${typedInput.type}`
        );

        const response = await ctx.client.get(
          `${ZOOM_API_BASE}/users/${encodeURIComponent(typedInput.userId)}/meetings`,
          {
            params: {
              type: typedInput.type,
              ...(typedInput.pageSize !== undefined && { page_size: typedInput.pageSize }),
              ...(typedInput.nextPageToken && { next_page_token: typedInput.nextPageToken }),
            },
          }
        );
        const { data } = response;
        return {
          page_size: data.page_size,
          next_page_token: data.next_page_token,
          total_records: data.total_records,
          meetings: (data.meetings ?? []).map(pickMeetingSummary),
        };
      },
    },

    getMeetingDetails: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.getMeetingDetails.description',
        {
          defaultMessage:
            'Get details of a scheduled or recurring meeting, including topic, agenda, start time, duration, timezone, host info, join URL, and settings. Use this to understand what a meeting is about before looking at recordings or participants.',
        }
      ),
      input: ZoomGetMeetingDetailsInputSchema,
      output: z.object({
        uuid: z.string().optional(),
        id: z.number().optional(),
        host_email: z.string().optional(),
        topic: z.string().optional(),
        type: z
          .number()
          .optional()
          .describe(
            'Meeting type: 1=instant, 2=scheduled, 3=recurring no fixed time, 8=recurring fixed time'
          ),
        status: z.string().optional().describe('Meeting status: waiting or started'),
        start_time: z.string().optional(),
        duration: z.number().optional().describe('Scheduled duration in minutes'),
        timezone: z.string().optional(),
        agenda: z.string().optional().describe('Meeting agenda/description'),
        join_url: z.string().optional(),
        password: z.string().optional().describe('Meeting passcode required to join'),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomGetMeetingDetailsInput =
          ZoomGetMeetingDetailsInputSchema.parse(input);
        const encodedId = encodeZoomId(typedInput.meetingId);
        ctx.log.debug(`Zoom getting meeting details for ${typedInput.meetingId}`);

        const { data } = await ctx.client.get(`${ZOOM_API_BASE}/meetings/${encodedId}`);
        return {
          uuid: data.uuid,
          id: data.id,
          host_email: data.host_email,
          topic: data.topic,
          type: data.type,
          status: data.status,
          start_time: data.start_time,
          duration: data.duration,
          timezone: data.timezone,
          agenda: data.agenda,
          join_url: data.join_url,
          password: data.password,
        };
      },
    },

    getPastMeetingDetails: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.getPastMeetingDetails.description',
        {
          defaultMessage:
            'Get summary information for a meeting that has already ended. Returns total minutes, participant count, start/end times. Only works for past meetings.',
        }
      ),
      input: ZoomGetPastMeetingDetailsInputSchema,
      output: z.object({
        uuid: z.string().optional(),
        id: z.number().optional(),
        topic: z.string().optional(),
        start_time: z.string().optional(),
        end_time: z.string().optional(),
        duration: z.number().optional().describe('Actual meeting duration in minutes'),
        total_minutes: z.number().optional().describe('Sum of all participant minutes'),
        participants_count: z.number().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomGetPastMeetingDetailsInput =
          ZoomGetPastMeetingDetailsInputSchema.parse(input);
        const encodedId = encodeZoomId(typedInput.meetingId);
        ctx.log.debug(`Zoom getting past meeting details for ${typedInput.meetingId}`);

        const { data } = await ctx.client.get(`${ZOOM_API_BASE}/past_meetings/${encodedId}`);
        return {
          uuid: data.uuid,
          id: data.id,
          topic: data.topic,
          start_time: data.start_time,
          end_time: data.end_time,
          duration: data.duration,
          total_minutes: data.total_minutes,
          participants_count: data.participants_count,
        };
      },
    },

    getMeetingRecordings: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.getMeetingRecordings.description',
        {
          defaultMessage:
            'Get cloud recordings for a meeting. Response includes recording_files with types: shared_screen_with_speaker_view, audio_only, audio_transcript, chat_file, and more.',
        }
      ),
      input: ZoomGetMeetingRecordingsInputSchema,
      output: z.object({
        topic: z.string().optional(),
        start_time: z.string().optional(),
        duration: z.number().optional(),
        recording_count: z.number().optional(),
        password: z.string().optional().describe('Passcode to access the recording files'),
        recording_files: z.array(ZoomRecordingFileSchema),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomGetMeetingRecordingsInput =
          ZoomGetMeetingRecordingsInputSchema.parse(input);
        const encodedId = encodeZoomId(typedInput.meetingId);
        ctx.log.debug(`Zoom getting recordings for meeting ${typedInput.meetingId}`);

        const { data } = await ctx.client.get(`${ZOOM_API_BASE}/meetings/${encodedId}/recordings`);
        return {
          topic: data.topic,
          start_time: data.start_time,
          duration: data.duration,
          recording_count: data.recording_count,
          password: data.password,
          recording_files: (data.recording_files ?? []).map(pickRecordingFile),
        };
      },
    },

    listUserRecordings: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.listUserRecordings.description',
        {
          defaultMessage:
            'List cloud recordings for a user within a date range. Returns meetings with their recording_files (including transcripts and chat files).',
        }
      ),
      input: ZoomListUserRecordingsInputSchema,
      output: ZoomPaginationOutputSchema.extend({
        from: z.string().optional(),
        to: z.string().optional(),
        meetings: z.array(
          ZoomMeetingSummarySchema.extend({
            recording_count: z.number().optional(),
            recording_files: z.array(ZoomRecordingFileSchema),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomListUserRecordingsInput =
          ZoomListUserRecordingsInputSchema.parse(input);
        ctx.log.debug(`Zoom listing recordings for user ${typedInput.userId}`);

        const { data } = await ctx.client.get(
          `${ZOOM_API_BASE}/users/${encodeURIComponent(typedInput.userId)}/recordings`,
          {
            params: {
              ...(typedInput.from && { from: typedInput.from }),
              ...(typedInput.to && { to: typedInput.to }),
              ...(typedInput.pageSize !== undefined && { page_size: typedInput.pageSize }),
              ...(typedInput.nextPageToken && { next_page_token: typedInput.nextPageToken }),
            },
          }
        );
        return {
          page_size: data.page_size,
          next_page_token: data.next_page_token,
          total_records: data.total_records,
          from: data.from,
          to: data.to,
          meetings: (data.meetings ?? []).map((m: AnyRecord) => ({
            ...pickMeetingSummary(m),
            recording_count: m.recording_count,
            recording_files: ((m.recording_files as AnyRecord[]) ?? []).map(pickRecordingFile),
          })),
        };
      },
    },

    downloadRecordingFile: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.downloadRecordingFile.description',
        {
          defaultMessage:
            'Download a recording file by its download URL. Works for transcripts (VTT format), chat logs, and other recording files. Returns the content as text.',
        }
      ),
      input: ZoomDownloadRecordingFileInputSchema,
      output: z.object({
        contentType: z.string().optional().describe('Content-Type header from the response'),
        text: z.string().describe('File content as UTF-8 text (may be truncated)'),
        truncated: z.boolean().describe('Whether the content was truncated to maxChars'),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomDownloadRecordingFileInput =
          ZoomDownloadRecordingFileInputSchema.parse(input);
        const sanitizedUrl = typedInput.downloadUrl.split('?')[0];
        ctx.log.debug(`Zoom downloading recording file from ${sanitizedUrl}`);

        const response = await ctx.client.get(typedInput.downloadUrl, {
          responseType: 'arraybuffer',
        });
        const fullText = Buffer.from(response.data).toString('utf8');
        const limit = typedInput.maxChars ?? ZOOM_DEFAULT_MAX_RECORDING_CONTENT_CHARS;
        const truncated = fullText.length > limit;
        return {
          contentType: response.headers?.['content-type'],
          text: truncated ? fullText.slice(0, limit) : fullText,
          truncated,
        };
      },
    },

    getMeetingParticipants: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.getMeetingParticipants.description',
        {
          defaultMessage:
            'List participants of a past meeting. Returns participant name, email, join/leave times, and duration.',
        }
      ),
      input: ZoomGetMeetingParticipantsInputSchema,
      output: ZoomPaginationOutputSchema.extend({
        participants: z.array(ZoomParticipantSchema),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomGetMeetingParticipantsInput =
          ZoomGetMeetingParticipantsInputSchema.parse(input);
        const encodedId = encodeZoomId(typedInput.meetingId);
        ctx.log.debug(`Zoom listing participants for past meeting ${typedInput.meetingId}`);

        const { data } = await ctx.client.get(
          `${ZOOM_API_BASE}/past_meetings/${encodedId}/participants`,
          {
            params: {
              ...(typedInput.pageSize !== undefined && { page_size: typedInput.pageSize }),
              ...(typedInput.nextPageToken && { next_page_token: typedInput.nextPageToken }),
            },
          }
        );
        return {
          page_size: data.page_size,
          next_page_token: data.next_page_token,
          total_records: data.total_records,
          participants: (data.participants ?? []).map(pickParticipant),
        };
      },
    },

    getMeetingRegistrants: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.getMeetingRegistrants.description',
        {
          defaultMessage:
            'List registrants of a meeting. Works for future and past meetings that have registration enabled. Returns registrant name, email, and registration status.',
        }
      ),
      input: ZoomGetMeetingRegistrantsInputSchema,
      output: ZoomPaginationOutputSchema.extend({
        registrants: z.array(ZoomRegistrantSchema),
      }),
      handler: async (ctx, input) => {
        const typedInput: ZoomGetMeetingRegistrantsInput =
          ZoomGetMeetingRegistrantsInputSchema.parse(input);
        const encodedId = encodeZoomId(typedInput.meetingId);
        ctx.log.debug(`Zoom listing registrants for meeting ${typedInput.meetingId}`);

        const { data } = await ctx.client.get(
          `${ZOOM_API_BASE}/meetings/${encodedId}/registrants`,
          {
            params: {
              ...(typedInput.status && { status: typedInput.status }),
              ...(typedInput.pageSize !== undefined && { page_size: typedInput.pageSize }),
              ...(typedInput.nextPageToken && { next_page_token: typedInput.nextPageToken }),
            },
          }
        );
        return {
          page_size: data.page_size,
          next_page_token: data.next_page_token,
          total_records: data.total_records,
          registrants: (data.registrants ?? []).map(pickRegistrant),
        };
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.zoom.test.description', {
      defaultMessage: 'Verifies Zoom connection by checking API access',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Zoom test handler — checking /users/me');

      try {
        const response = await ctx.client.get(`${ZOOM_API_BASE}/users/me`);
        const displayName =
          `${response.data.first_name ?? ''} ${response.data.last_name ?? ''}`.trim() ||
          response.data.email ||
          'Unknown';
        return {
          ok: true,
          message: `Successfully connected to Zoom as: ${displayName}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
