import type { SerializableRecord } from '@kbn/utility-types';
export interface ObservabilityLogsExplorerLocationState extends SerializableRecord {
    origin?: {
        id: 'application-log-onboarding';
    };
}
export declare const OBS_LOGS_EXPLORER_LOGS_VIEWER_KEY = "obs-logs-explorer:lastUsedViewer";
