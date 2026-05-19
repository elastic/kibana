import type { Filter } from '@kbn/es-query';
import type { SerializableRecord } from '@kbn/utility-types';
export declare const sloDetailsLocatorID = "SLO_DETAILS_LOCATOR";
export declare const sloDetailsHistoryLocatorID = "SLO_DETAILS_HISTORY_LOCATOR";
export declare const sloEditLocatorID = "SLO_EDIT_LOCATOR";
export declare const sloListLocatorID = "SLO_LIST_LOCATOR";
export declare const OVERVIEW_TAB_ID = "overview";
export declare const HISTORY_TAB_ID = "history";
export declare const DEFINITION_TAB_ID = "definition";
export declare const ALERTS_TAB_ID = "alerts";
export type SloTabId = typeof OVERVIEW_TAB_ID | typeof ALERTS_TAB_ID | typeof HISTORY_TAB_ID | typeof DEFINITION_TAB_ID;
export interface SloDetailsLocatorParams extends SerializableRecord {
    sloId: string;
    instanceId?: string;
    tabId?: SloTabId;
}
export interface SloDetailsHistoryLocatorParams extends SerializableRecord {
    id: string;
    instanceId?: string;
    encodedAppState?: string;
}
export interface SloListLocatorParams extends SerializableRecord {
    kqlQuery?: string;
    filters?: Filter[];
}
