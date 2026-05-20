import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { TelemetrySavedObjectAttributes } from './types';
export declare function updateTelemetrySavedObject(savedObjectsClient: SavedObjectsClientContract, savedObjectAttributes: TelemetrySavedObjectAttributes): Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<{
    enabled: boolean | null;
    lastVersionChecked: string;
    sendUsageFrom: "browser" | "server";
    lastReported: number;
    allowChangingOptInStatus: boolean;
    userHasSeenNotice: boolean;
    reportFailureCount: number;
    reportFailureVersion: string;
}>>;
