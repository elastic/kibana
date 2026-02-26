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
 * - Retrieving meeting recordings (including transcripts and chat files)
 * - Downloading recording files (transcripts, chat logs, audio, video)
 * - Listing participants of past meetings
 *
 * Auth: Bearer token (manual entry) until Kibana supports Zoom's S2S OAuth
 * (grant_type=account_credentials). Generate a token via:
 *   curl -X POST "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=ACCOUNT_ID" \
 *     -H "Authorization: Basic $(echo -n 'CLIENT_ID:CLIENT_SECRET' | base64)"
 * Tokens expire after 1 hour.
 * See https://developers.zoom.us/docs/internal-apps/s2s-oauth/
 *
 * Required granular scopes on the Zoom S2S OAuth app:
 *   user:read:user:admin
 *   meeting:read:list_meetings:admin
 *   meeting:read:list_past_participants:admin
 *   cloud_recording:read:list_recording_files:admin
 *   cloud_recording:read:list_user_recordings:admin
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

const ENABLE_TEMPORARY_MANUAL_TOKEN_AUTH = true; // Remove once Zoom S2S OAuth is natively supported.

const ZOOM_API_BASE = 'https://api.zoom.us/v2';

const ZoomPaginationOutputSchema = z.object({
  page_size: z.number().optional().describe('Number of records per page'),
  next_page_token: z.string().optional().describe('Token to fetch the next page of results'),
  total_records: z.number().optional().describe('Total number of records'),
});

export const Zoom: ConnectorSpec = {
  metadata: {
    id: '.zoom',
    displayName: 'Zoom',
    description: i18n.translate('core.kibanaConnectorSpecs.zoom.metadata.description', {
      defaultMessage:
        'Kibana Stack Connector for Zoom — access meetings, recordings, transcripts, and participants.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      ...(ENABLE_TEMPORARY_MANUAL_TOKEN_AUTH
        ? ([
            {
              type: 'bearer',
              defaults: {
                token: '',
              },
              overrides: {
                meta: {
                  token: {
                    sensitive: true,
                    label: i18n.translate(
                      'core.kibanaConnectorSpecs.zoom.auth.temporaryManualToken.label',
                      {
                        defaultMessage: 'Zoom access token',
                      }
                    ),
                    helpText: i18n.translate(
                      'core.kibanaConnectorSpecs.zoom.auth.temporaryManualToken.helpText',
                      {
                        defaultMessage:
                          'Paste a Zoom Server-to-Server OAuth access token. Generate one via the Zoom Marketplace or API. Tokens expire after 1 hour.',
                      }
                    ),
                  },
                },
              },
            },
          ] as const)
        : []),
    ],
  },

  actions: {
    listMeetings: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.zoom.actions.listMeetings.description',
        {
          defaultMessage: 'List meetings for a user. Use type=upcoming for future meetings.',
        }
      ),
      input: z.object({
        userId: z
          .string()
          .default('me')
          .describe('User ID or email. Use "me" for the authenticated user.'),
        type: z
          .enum(['scheduled', 'live', 'upcoming', 'upcoming_meetings', 'previous_meetings'])
          .default('upcoming')
          .describe('Meeting type filter'),
        pageSize: z.number().min(1).max(300).optional().describe('Number of results per page'),
        nextPageToken: z
          .string()
          .optional()
          .describe('Pagination token from a previous response'),
      }),
      output: ZoomPaginationOutputSchema.extend({
        meetings: z.array(z.any()).describe('Array of meeting objects'),
      }),
      handler: async (ctx, input) => {
        const { userId, type, pageSize, nextPageToken } = input as {
          userId: string;
          type: string;
          pageSize?: number;
          nextPageToken?: string;
        };
        ctx.log.debug(`Zoom listing meetings for user ${userId}, type=${type}`);

        const response = await ctx.client.get(`${ZOOM_API_BASE}/users/${userId}/meetings`, {
          params: {
            type,
            ...(pageSize !== undefined && { page_size: pageSize }),
            ...(nextPageToken && { next_page_token: nextPageToken }),
          },
        });
        return response.data;
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
      input: z.object({
        meetingId: z.string().describe('Meeting ID or UUID'),
      }),
      output: z
        .object({
          uuid: z.string().optional(),
          id: z.number().optional(),
          host_id: z.string().optional(),
          topic: z.string().optional(),
          start_time: z.string().optional(),
          duration: z.number().optional(),
          total_size: z.number().optional(),
          recording_count: z.number().optional(),
          recording_files: z
            .array(z.any())
            .describe(
              'Array of recording file objects. Each has: id, meeting_id, recording_start, recording_end, file_type, file_extension, file_size, download_url, status, recording_type'
            ),
        })
        .passthrough(),
      handler: async (ctx, input) => {
        const { meetingId } = input as { meetingId: string };
        ctx.log.debug(`Zoom getting recordings for meeting ${meetingId}`);

        const response = await ctx.client.get(
          `${ZOOM_API_BASE}/meetings/${meetingId}/recordings`
        );
        return response.data;
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
      input: z.object({
        userId: z
          .string()
          .default('me')
          .describe('User ID or email. Use "me" for the authenticated user.'),
        from: z
          .string()
          .optional()
          .describe('Start date (YYYY-MM-DD). Defaults to current date.'),
        to: z
          .string()
          .optional()
          .describe('End date (YYYY-MM-DD). Range cannot exceed 1 month.'),
        pageSize: z.number().min(1).max(300).optional().describe('Number of results per page'),
        nextPageToken: z
          .string()
          .optional()
          .describe('Pagination token from a previous response'),
      }),
      output: ZoomPaginationOutputSchema.extend({
        from: z.string().optional(),
        to: z.string().optional(),
        meetings: z
          .array(z.any())
          .describe('Array of meeting objects, each containing recording_files'),
      }),
      handler: async (ctx, input) => {
        const { userId, from, to, pageSize, nextPageToken } = input as {
          userId: string;
          from?: string;
          to?: string;
          pageSize?: number;
          nextPageToken?: string;
        };
        ctx.log.debug(`Zoom listing recordings for user ${userId}`);

        const response = await ctx.client.get(`${ZOOM_API_BASE}/users/${userId}/recordings`, {
          params: {
            ...(from && { from }),
            ...(to && { to }),
            ...(pageSize !== undefined && { page_size: pageSize }),
            ...(nextPageToken && { next_page_token: nextPageToken }),
          },
        });
        return response.data;
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
      input: z.object({
        downloadUrl: z
          .string()
          .url()
          .describe(
            'The download_url from a recording file object (obtained via getMeetingRecordings or listUserRecordings)'
          ),
      }),
      output: z.object({
        contentType: z.string().optional().describe('Content-Type header from the response'),
        text: z.string().describe('File content as UTF-8 text'),
      }),
      handler: async (ctx, input) => {
        const { downloadUrl } = input as { downloadUrl: string };
        ctx.log.debug(`Zoom downloading recording file from ${downloadUrl}`);

        const response = await ctx.client.get(downloadUrl, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data);
        return {
          contentType: response.headers?.['content-type'],
          text: buffer.toString('utf8'),
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
      input: z.object({
        meetingId: z.string().describe('Past meeting ID or UUID'),
        pageSize: z.number().min(1).max(300).optional().describe('Number of results per page'),
        nextPageToken: z
          .string()
          .optional()
          .describe('Pagination token from a previous response'),
      }),
      output: ZoomPaginationOutputSchema.extend({
        participants: z
          .array(z.any())
          .describe(
            'Array of participant objects with id, name, user_email, join_time, leave_time, duration'
          ),
      }),
      handler: async (ctx, input) => {
        const { meetingId, pageSize, nextPageToken } = input as {
          meetingId: string;
          pageSize?: number;
          nextPageToken?: string;
        };
        ctx.log.debug(`Zoom listing participants for past meeting ${meetingId}`);

        const response = await ctx.client.get(
          `${ZOOM_API_BASE}/past_meetings/${meetingId}/participants`,
          {
            params: {
              ...(pageSize !== undefined && { page_size: pageSize }),
              ...(nextPageToken && { next_page_token: nextPageToken }),
            },
          }
        );
        return response.data;
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
