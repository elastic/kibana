export interface SuricataEcs {
    eve?: SuricataEveData;
}
export interface SuricataEveData {
    alert?: SuricataAlertData;
    flow_id?: number[];
    proto?: string[];
}
export interface SuricataAlertData {
    signature?: string[];
    signature_id?: number[];
}
