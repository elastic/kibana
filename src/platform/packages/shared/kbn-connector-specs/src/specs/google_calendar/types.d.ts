import { z } from '@kbn/zod/v4';
export declare const SearchEventsInputSchema: z.ZodObject<{
    query: z.ZodString;
    calendarId: z.ZodDefault<z.ZodPreprocess<z.ZodOptional<z.ZodString>>>;
    timeMin: z.ZodOptional<z.ZodString>;
    timeMax: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodDefault<z.ZodNumber>;
    orderBy: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        startTime: "startTime";
        updated: "updated";
    }>>>;
}, z.core.$strip>;
export type SearchEventsInput = z.infer<typeof SearchEventsInputSchema>;
export declare const GetEventInputSchema: z.ZodObject<{
    eventId: z.ZodString;
    calendarId: z.ZodDefault<z.ZodPreprocess<z.ZodOptional<z.ZodString>>>;
}, z.core.$strip>;
export type GetEventInput = z.infer<typeof GetEventInputSchema>;
export declare const ListCalendarsInputSchema: z.ZodObject<{
    pageToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListCalendarsInput = z.infer<typeof ListCalendarsInputSchema>;
export declare const ListEventsInputSchema: z.ZodObject<{
    calendarId: z.ZodDefault<z.ZodPreprocess<z.ZodOptional<z.ZodString>>>;
    timeMin: z.ZodOptional<z.ZodString>;
    timeMax: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodDefault<z.ZodNumber>;
    pageToken: z.ZodOptional<z.ZodString>;
    orderBy: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        startTime: "startTime";
        updated: "updated";
    }>>>;
}, z.core.$strip>;
export type ListEventsInput = z.infer<typeof ListEventsInputSchema>;
export declare const FreeBusyInputSchema: z.ZodObject<{
    timeMin: z.ZodString;
    timeMax: z.ZodString;
    calendarIds: z.ZodArray<z.ZodString>;
    timeZone: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type FreeBusyInput = z.infer<typeof FreeBusyInputSchema>;
