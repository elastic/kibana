export interface CustomQuery {
    kind: 'kuery' | 'lucene';
    expression: string;
}
export interface TimelineRedirectArgs {
    from?: string;
    to?: string;
    eventId?: string;
    index: string;
    baseURL: string;
}
export declare const getSecurityTimelineRedirectUrl: ({ from, to, index, eventId, baseURL, }: TimelineRedirectArgs) => string;
