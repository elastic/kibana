/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ZOOM_DEFAULT_MAX_RECORDING_CONTENT_CHARS = 100_000;

// ---------------------------------------------------------------------------
// Shared output schemas — reusable shapes for Zoom API objects
// ---------------------------------------------------------------------------

export const ZoomPaginationOutputSchema = z.object({
  page_size: z.number().optional().describe('Number of records per page'),
  next_page_token: z.string().optional().describe('Token to fetch the next page of results'),
  total_records: z.number().optional().describe('Total number of records'),
});

export const ZoomMeetingSummarySchema = z.object({
  id: z.number().optional().describe('Numeric meeting ID'),
  uuid: z.string().optional().describe('Meeting UUID'),
  topic: z.string().optional().describe('Meeting topic/title'),
  type: z
    .number()
    .optional()
    .describe(
      'Meeting type: 1=instant, 2=scheduled, 3=recurring no fixed time, 8=recurring fixed time'
    ),
  start_time: z.string().optional().describe('Scheduled start time (ISO 8601)'),
  duration: z.number().optional().describe('Scheduled duration in minutes'),
  timezone: z.string().optional().describe('Timezone of the meeting'),
  join_url: z.string().optional().describe('URL to join the meeting'),
  password: z.string().optional().describe('Meeting passcode required to join'),
});

export const ZoomRecordingFileSchema = z.object({
  id: z.string().optional().describe('Recording file ID'),
  recording_type: z
    .string()
    .optional()
    .describe(
      'Type of recording: shared_screen_with_speaker_view, audio_only, audio_transcript, chat_file, timeline, summary, etc.'
    ),
  file_type: z.string().optional().describe('File format: MP4, M4A, VTT, TXT, JSON, etc.'),
  file_size: z.number().optional().describe('File size in bytes'),
  download_url: z.string().optional().describe('URL to download the recording file'),
  status: z.string().optional().describe('Recording status: completed or processing'),
});

export const ZoomParticipantSchema = z.object({
  name: z.string().optional().describe('Participant display name'),
  user_email: z.string().optional().describe('Participant email address'),
  join_time: z.string().optional().describe('Time the participant joined (ISO 8601)'),
  leave_time: z.string().optional().describe('Time the participant left (ISO 8601)'),
  duration: z.number().optional().describe('Time in meeting in seconds'),
});

export const ZoomRegistrantSchema = z.object({
  email: z.string().optional().describe('Registrant email address'),
  first_name: z.string().optional().describe('Registrant first name'),
  last_name: z.string().optional().describe('Registrant last name'),
  status: z.string().optional().describe('Registration status: approved, pending, or denied'),
});

export const ZoomUserProfileSchema = z.object({
  id: z.string().optional().describe('Zoom user ID'),
  display_name: z.string().optional().describe('Display name'),
  first_name: z.string().optional().describe('First name'),
  last_name: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  type: z.number().optional().describe('Account type: 1=Basic, 2=Licensed, 3=On-Prem, 99=None'),
  role_name: z.string().optional().describe('Role name (Owner, Admin, Member)'),
  status: z.string().optional().describe('Account status: active, inactive, or pending'),
  timezone: z.string().optional().describe('User timezone'),
  language: z.string().optional().describe('Preferred language'),
  pmi: z.number().optional().describe('Personal Meeting ID'),
  personal_meeting_url: z.string().optional().describe('Personal meeting room URL'),
  dept: z.string().optional().describe('Department'),
  job_title: z.string().optional().describe('Job title'),
  company: z.string().optional().describe('Company'),
  location: z.string().optional().describe('Location'),
  account_id: z.string().optional().describe('Zoom account ID'),
  created_at: z.string().optional().describe('Account creation timestamp (ISO 8601)'),
  last_login_time: z.string().optional().describe('Last login timestamp (ISO 8601)'),
});

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const ZoomWhoAmIInputSchema = z.object({});
export type ZoomWhoAmIInput = z.infer<typeof ZoomWhoAmIInputSchema>;

export const ZoomListMeetingsInputSchema = z.object({
  userId: z
    .string()
    .default('me')
    .describe('User ID or email. Use "me" for the authenticated user.'),
  type: z
    .enum(['scheduled', 'live', 'upcoming', 'upcoming_meetings', 'previous_meetings'])
    .default('upcoming')
    .describe(
      'Meeting type filter. Values: scheduled (all scheduled meetings), live (in-progress), upcoming (default, future meetings), upcoming_meetings (similar to upcoming), previous_meetings (past meetings).'
    ),
  pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
  nextPageToken: z.string().optional().describe('Pagination token from a previous response'),
});
export type ZoomListMeetingsInput = z.infer<typeof ZoomListMeetingsInputSchema>;

export const ZoomGetMeetingDetailsInputSchema = z.object({
  meetingId: z.string().describe('Meeting ID or UUID'),
});
export type ZoomGetMeetingDetailsInput = z.infer<typeof ZoomGetMeetingDetailsInputSchema>;

export const ZoomGetPastMeetingDetailsInputSchema = z.object({
  meetingId: z.string().describe('Past meeting ID or UUID'),
});
export type ZoomGetPastMeetingDetailsInput = z.infer<typeof ZoomGetPastMeetingDetailsInputSchema>;

export const ZoomGetMeetingRecordingsInputSchema = z.object({
  meetingId: z.string().describe('Meeting ID or UUID'),
});
export type ZoomGetMeetingRecordingsInput = z.infer<typeof ZoomGetMeetingRecordingsInputSchema>;

export const ZoomListUserRecordingsInputSchema = z.object({
  userId: z
    .string()
    .default('me')
    .describe('User ID or email. Use "me" for the authenticated user.'),
  from: z.string().optional().describe('Start date (YYYY-MM-DD). Defaults to current date.'),
  to: z.string().optional().describe('End date (YYYY-MM-DD). Range cannot exceed 1 month.'),
  pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
  nextPageToken: z.string().optional().describe('Pagination token from a previous response'),
});
export type ZoomListUserRecordingsInput = z.infer<typeof ZoomListUserRecordingsInputSchema>;

export const ZoomDownloadRecordingFileInputSchema = z.object({
  downloadUrl: z
    .string()
    .url()
    .describe(
      'The download_url from a recording file object (obtained via getMeetingRecordings or listUserRecordings)'
    ),
  maxChars: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      `Maximum characters to return. Defaults to ${ZOOM_DEFAULT_MAX_RECORDING_CONTENT_CHARS}. Content exceeding this limit is truncated.`
    ),
});
export type ZoomDownloadRecordingFileInput = z.infer<typeof ZoomDownloadRecordingFileInputSchema>;

export const ZoomGetMeetingParticipantsInputSchema = z.object({
  meetingId: z.string().describe('Past meeting ID or UUID'),
  pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
  nextPageToken: z.string().optional().describe('Pagination token from a previous response'),
});
export type ZoomGetMeetingParticipantsInput = z.infer<typeof ZoomGetMeetingParticipantsInputSchema>;

export const ZoomGetMeetingRegistrantsInputSchema = z.object({
  meetingId: z.string().describe('Meeting ID or UUID'),
  status: z
    .enum(['pending', 'approved', 'denied'])
    .optional()
    .describe('Filter by registration status. Defaults to approved.'),
  pageSize: z.number().min(1).max(300).optional().describe('Number of results per page (1-300)'),
  nextPageToken: z.string().optional().describe('Pagination token from a previous response'),
});
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
