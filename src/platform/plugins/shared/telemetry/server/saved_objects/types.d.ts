export interface TelemetrySavedObjectAttributes {
    enabled?: boolean | null;
    lastVersionChecked?: string;
    sendUsageFrom?: 'browser' | 'server';
    lastReported?: number;
    allowChangingOptInStatus?: boolean;
    userHasSeenNotice?: boolean;
    reportFailureCount?: number;
    reportFailureVersion?: string;
}
export type TelemetrySavedObject = TelemetrySavedObjectAttributes;
