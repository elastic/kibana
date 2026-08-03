import type { Storage } from '@kbn/kibana-utils-plugin/public';
export interface DataGridOptionsRecord {
    previousRowHeight: number;
    previousConfigRowHeight: number;
}
export declare const getStoredRowHeight: (storage: Storage, consumer: string, key: string) => DataGridOptionsRecord | null;
export declare const updateStoredRowHeight: (newRowHeight: number, configRowHeight: number, storage: Storage, consumer: string, key: string) => void;
