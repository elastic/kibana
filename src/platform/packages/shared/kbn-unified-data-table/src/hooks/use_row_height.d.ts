import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { RowHeightSettingsProps } from '../components/row_height_settings';
export declare enum RowHeightType {
    header = "header",
    row = "row"
}
export interface UseRowHeightProps {
    type: RowHeightType;
    storage: Storage;
    consumer: string;
    key: string;
    defaultRowHeight: number;
    configRowHeight?: number;
    rowHeightState?: number;
    onUpdateRowHeight?: (rowHeight: number) => void;
}
interface ResolveRowHeightParams {
    storage: Storage;
    consumer: string;
    key: string;
    configRowHeight: number;
    rowHeightState?: number;
}
export declare const ROW_HEIGHT_STORAGE_KEY = "dataGridRowHeight";
export declare const getRowHeight: ({ storage, consumer, rowHeightState, configRowHeight, }: Pick<ResolveRowHeightParams, "storage" | "consumer" | "rowHeightState"> & {
    configRowHeight?: number;
}) => number;
export declare const useRowHeight: ({ type, storage, consumer, key, defaultRowHeight, configRowHeight, rowHeightState, onUpdateRowHeight, }: UseRowHeightProps) => {
    rowHeight: "auto" | "custom";
    rowHeightLines: number;
    lineCountInput: number | undefined;
    onChangeRowHeight: ((newRowHeight: RowHeightSettingsProps["rowHeight"]) => void) | undefined;
    onChangeRowHeightLines: ((newRowHeightLines: number, isValid: boolean) => void) | undefined;
};
export {};
