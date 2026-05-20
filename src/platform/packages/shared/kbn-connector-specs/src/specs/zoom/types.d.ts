import { z } from '@kbn/zod/v4';
export declare const ZOOM_DEFAULT_MAX_RECORDING_CONTENT_CHARS = 100000;
export declare const ZoomPaginationOutputSchema: z.ZodObject<{
    page_size: z.ZodOptional<z.ZodNumber>;
    next_page_token: z.ZodOptional<z.ZodString>;
    total_records: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ZoomMeetingSummarySchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodNumber>;
    uuid: z.ZodOptional<z.ZodString>;
    topic: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodNumber>;
    start_time: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    timezone: z.ZodOptional<z.ZodString>;
    join_url: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ZoomRecordingFileSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    recording_type: z.ZodOptional<z.ZodString>;
    file_type: z.ZodOptional<z.ZodString>;
    file_size: z.ZodOptional<z.ZodNumber>;
    download_url: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ZoomParticipantSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    user_email: z.ZodOptional<z.ZodString>;
    join_time: z.ZodOptional<z.ZodString>;
    leave_time: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ZoomRegistrantSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    first_name: z.ZodOptional<z.ZodString>;
    last_name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ZoomUserProfileSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    display_name: z.ZodOptional<z.ZodString>;
    first_name: z.ZodOptional<z.ZodString>;
    last_name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodNumber>;
    role_name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    pmi: z.ZodOptional<z.ZodNumber>;
    personal_meeting_url: z.ZodOptional<z.ZodString>;
    dept: z.ZodOptional<z.ZodString>;
    job_title: z.ZodOptional<z.ZodString>;
    company: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    account_id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    last_login_time: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ZoomWhoAmIInputSchema: z.ZodObject<{}, z.core.$strip>;
export type ZoomWhoAmIInput = z.infer<typeof ZoomWhoAmIInputSchema>;
export declare const ZoomListMeetingsInputSchema: z.ZodObject<{
    userId: z.ZodDefault<z.ZodString>;
    type: z.ZodDefault<z.ZodEnum<{
        scheduled: "scheduled";
        live: "live";
        upcoming: "upcoming";
        upcoming_meetings: "upcoming_meetings";
        previous_meetings: "previous_meetings";
    }>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
    nextPageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ZoomListMeetingsInput = z.infer<typeof ZoomListMeetingsInputSchema>;
export declare const ZoomGetMeetingDetailsInputSchema: z.ZodObject<{
    meetingId: z.ZodString;
}, z.core.$strip>;
export type ZoomGetMeetingDetailsInput = z.infer<typeof ZoomGetMeetingDetailsInputSchema>;
export declare const ZoomGetPastMeetingDetailsInputSchema: z.ZodObject<{
    meetingId: z.ZodString;
}, z.core.$strip>;
export type ZoomGetPastMeetingDetailsInput = z.infer<typeof ZoomGetPastMeetingDetailsInputSchema>;
export declare const ZoomGetMeetingRecordingsInputSchema: z.ZodObject<{
    meetingId: z.ZodString;
}, z.core.$strip>;
export type ZoomGetMeetingRecordingsInput = z.infer<typeof ZoomGetMeetingRecordingsInputSchema>;
export declare const ZoomListUserRecordingsInputSchema: z.ZodObject<{
    userId: z.ZodDefault<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodOptional<z.ZodNumber>;
    nextPageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ZoomListUserRecordingsInput = z.infer<typeof ZoomListUserRecordingsInputSchema>;
export declare const ZoomDownloadRecordingFileInputSchema: z.ZodObject<{
    downloadUrl: z.ZodString;
    maxChars: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ZoomDownloadRecordingFileInput = z.infer<typeof ZoomDownloadRecordingFileInputSchema>;
export declare const ZoomGetMeetingParticipantsInputSchema: z.ZodObject<{
    meetingId: z.ZodString;
    pageSize: z.ZodOptional<z.ZodNumber>;
    nextPageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ZoomGetMeetingParticipantsInput = z.infer<typeof ZoomGetMeetingParticipantsInputSchema>;
export declare const ZoomGetMeetingRegistrantsInputSchema: z.ZodObject<{
    meetingId: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        denied: "denied";
        approved: "approved";
    }>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
    nextPageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ZoomGetMeetingRegistrantsInput = z.infer<typeof ZoomGetMeetingRegistrantsInputSchema>;
export type AnyRecord = Record<string, unknown>;
export declare const pickMeetingSummary: (m: AnyRecord) => {
    id: unknown;
    uuid: unknown;
    topic: unknown;
    type: unknown;
    start_time: unknown;
    duration: unknown;
    timezone: unknown;
    join_url: unknown;
    password: unknown;
};
export declare const pickRecordingFile: (f: AnyRecord) => {
    id: unknown;
    recording_type: unknown;
    file_type: unknown;
    file_size: unknown;
    download_url: unknown;
    status: unknown;
};
export declare const pickParticipant: (p: AnyRecord) => {
    name: unknown;
    user_email: unknown;
    join_time: unknown;
    leave_time: unknown;
    duration: unknown;
};
export declare const pickRegistrant: (r: AnyRecord) => {
    email: unknown;
    first_name: unknown;
    last_name: unknown;
    status: unknown;
};
export declare const pickUserProfile: (u: AnyRecord) => {
    id: unknown;
    display_name: unknown;
    first_name: unknown;
    last_name: unknown;
    email: unknown;
    type: unknown;
    role_name: unknown;
    status: unknown;
    timezone: unknown;
    language: unknown;
    pmi: unknown;
    personal_meeting_url: unknown;
    dept: unknown;
    job_title: unknown;
    company: unknown;
    location: unknown;
    account_id: unknown;
    created_at: unknown;
    last_login_time: unknown;
};
