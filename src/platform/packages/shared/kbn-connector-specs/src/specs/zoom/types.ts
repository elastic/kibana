/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ZOOM_DEFAULT_MAX_RECORDING_CONTENT_CHARS = 100_000;

// GET /meetings/{meetingId} and /meetings/{meetingId}/registrants take the numeric (int64)
// meeting ID, not a UUID; spaces, as Zoom displays the ID, are stripped before sending.
const ZOOM_NUMERIC_MEETING_ID_PATTERN = /^\d[\d ]*$/;
// `from` and `to` of GET /users/{userId}/recordings have format `date` (YYYY-MM-DD).
const ZOOM_ISO_DATE_LENGTH = 10;

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const ZoomWhoAmIInputSchema = lazySchema(() => z.object({}));
export type ZoomWhoAmIInput = z.infer<typeof ZoomWhoAmIInputSchema>;

export const ZoomListMeetingsInputSchema = lazySchema(() =>
  z.object({
    userId: z
      .string()
      .max(320)
      .default('me')
      .describe('User ID or email. Use "me" for the authenticated user.'),
    type: z
      .enum(['scheduled', 'live', 'upcoming', 'upcoming_meetings', 'previous_meetings'])
      .default('upcoming')
      .describe(
        'Meeting type filter. Values: scheduled (all scheduled meetings), live (in-progress), upcoming (default, future meetings), upcoming_meetings (similar to upcoming), previous_meetings (past meetings).'
      ),
    pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
    nextPageToken: z
      .string()
      .max(2048)
      .optional()
      .describe('Pagination token from a previous response'),
  })
);
export type ZoomListMeetingsInput = z.infer<typeof ZoomListMeetingsInputSchema>;

export const ZoomGetMeetingDetailsInputSchema = lazySchema(() =>
  z.object({
    meetingId: z
      .string()
      .max(200)
      .regex(ZOOM_NUMERIC_MEETING_ID_PATTERN)
      .describe('Numeric meeting ID (not a UUID)'),
  })
);
export type ZoomGetMeetingDetailsInput = z.infer<typeof ZoomGetMeetingDetailsInputSchema>;

export const ZoomGetPastMeetingDetailsInputSchema = lazySchema(() =>
  z.object({
    meetingId: z.string().max(200).describe('Past meeting ID or UUID'),
  })
);
export type ZoomGetPastMeetingDetailsInput = z.infer<typeof ZoomGetPastMeetingDetailsInputSchema>;

export const ZoomGetMeetingRecordingsInputSchema = lazySchema(() =>
  z.object({
    meetingId: z.string().max(200).describe('Meeting ID or UUID'),
  })
);
export type ZoomGetMeetingRecordingsInput = z.infer<typeof ZoomGetMeetingRecordingsInputSchema>;

export const ZoomListUserRecordingsInputSchema = lazySchema(() =>
  z.object({
    userId: z
      .string()
      .max(320)
      .default('me')
      .describe('User ID or email. Use "me" for the authenticated user.'),
    from: z.iso
      .date()
      .max(ZOOM_ISO_DATE_LENGTH)
      .optional()
      .describe('Start date (YYYY-MM-DD). Defaults to current date.'),
    to: z.iso
      .date()
      .max(ZOOM_ISO_DATE_LENGTH)
      .optional()
      .describe('End date (YYYY-MM-DD). Range cannot exceed 1 month.'),
    pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
    nextPageToken: z
      .string()
      .max(2048)
      .optional()
      .describe('Pagination token from a previous response'),
  })
);
export type ZoomListUserRecordingsInput = z.infer<typeof ZoomListUserRecordingsInputSchema>;

export const ZoomDownloadRecordingFileInputSchema = lazySchema(() =>
  z.object({
    downloadUrl: z
      .string()
      .url()
      .max(2048)
      .describe(
        'The download_url from a recording file object (obtained via getMeetingRecordings or listUserRecordings). Must be an https URL on zoom.us or a zoom.us subdomain.'
      ),
    maxChars: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        `Maximum characters to return. Defaults to ${ZOOM_DEFAULT_MAX_RECORDING_CONTENT_CHARS}. Content exceeding this limit is truncated.`
      ),
  })
);
export type ZoomDownloadRecordingFileInput = z.infer<typeof ZoomDownloadRecordingFileInputSchema>;

export const ZoomGetMeetingParticipantsInputSchema = lazySchema(() =>
  z.object({
    meetingId: z.string().max(200).describe('Past meeting ID or UUID'),
    pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
    nextPageToken: z
      .string()
      .max(2048)
      .optional()
      .describe('Pagination token from a previous response'),
  })
);
export type ZoomGetMeetingParticipantsInput = z.infer<typeof ZoomGetMeetingParticipantsInputSchema>;

export const ZoomGetMeetingRegistrantsInputSchema = lazySchema(() =>
  z.object({
    meetingId: z
      .string()
      .max(200)
      .regex(ZOOM_NUMERIC_MEETING_ID_PATTERN)
      .describe('Numeric meeting ID (not a UUID)'),
    status: z
      .enum(['pending', 'approved', 'denied'])
      .optional()
      .describe('Filter by registration status. Defaults to approved.'),
    pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
    nextPageToken: z
      .string()
      .max(2048)
      .optional()
      .describe('Pagination token from a previous response'),
  })
);
export type ZoomGetMeetingRegistrantsInput = z.infer<typeof ZoomGetMeetingRegistrantsInputSchema>;

// ---------------------------------------------------------------------------
// Response transformers — pick only the fields useful for LLM context
// ---------------------------------------------------------------------------

export type AnyRecord = Record<string, unknown>;

export const pickMeetingSummary = (m: AnyRecord) => ({
  id: m.id,
  uuid: m.uuid,
  topic: m.topic,
  type: m.type,
  start_time: m.start_time,
  duration: m.duration,
  timezone: m.timezone,
  join_url: m.join_url,
  password: m.password,
});

export const pickRecordingFile = (f: AnyRecord) => ({
  id: f.id,
  recording_type: f.recording_type,
  file_type: f.file_type,
  file_size: f.file_size,
  download_url: f.download_url,
  status: f.status,
});

export const pickParticipant = (p: AnyRecord) => ({
  name: p.name,
  user_email: p.user_email,
  join_time: p.join_time,
  leave_time: p.leave_time,
  duration: p.duration,
});

export const pickRegistrant = (r: AnyRecord) => ({
  email: r.email,
  first_name: r.first_name,
  last_name: r.last_name,
  status: r.status,
});

export const pickUserProfile = (u: AnyRecord) => ({
  id: u.id,
  display_name: u.display_name,
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  type: u.type,
  role_name: u.role_name,
  status: u.status,
  timezone: u.timezone,
  language: u.language,
  pmi: u.pmi,
  personal_meeting_url: u.personal_meeting_url,
  dept: u.dept,
  job_title: u.job_title,
  company: u.company,
  location: u.location,
  account_id: u.account_id,
  created_at: u.created_at,
  last_login_time: u.last_login_time,
});
