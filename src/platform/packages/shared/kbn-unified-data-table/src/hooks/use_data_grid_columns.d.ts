import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { Capabilities } from '@kbn/core/public';
import type { UnifiedDataTableSettings } from '../types';
export interface UseColumnsProps {
    capabilities: Capabilities;
    dataView: DataView;
    dataViews: DataViewsContract;
    setAppState: (state: {
        columns: string[];
        sort?: string[][];
        settings?: UnifiedDataTableSettings;
    }) => void;
    columns?: string[];
    sort?: string[][];
    defaultOrder?: string;
    settings?: UnifiedDataTableSettings;
}
export declare const useColumns: ({ capabilities, dataView, dataViews, setAppState, columns, sort, defaultOrder, settings, }: UseColumnsProps) => {
    columns: string[];
    onAddColumn: (columnName: string) => void;
    onRemoveColumn: (columnName: string) => void;
    onMoveColumn: (columnName: string, newIndex: number) => void;
    onSetColumns: (nextColumns: string[], hideTimeColumn: boolean) => void;
};
