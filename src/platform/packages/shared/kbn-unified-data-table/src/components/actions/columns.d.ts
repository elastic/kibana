import type { Capabilities } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { UnifiedDataTableSettings } from '../../types';
export declare function getStateColumnActions({ capabilities, dataView, dataViews, setAppState, columns, sort, defaultOrder, settings, }: {
    capabilities: Capabilities;
    dataView: DataView;
    dataViews: DataViewsContract;
    setAppState: (state: {
        columns: string[];
        sort?: string[][];
        settings?: UnifiedDataTableSettings;
    }) => void;
    columns?: string[];
    sort: string[][] | undefined;
    defaultOrder: string;
    settings?: UnifiedDataTableSettings;
}): {
    onAddColumn: (columnName: string) => void;
    onRemoveColumn: (columnName: string) => void;
    onMoveColumn: (columnName: string, newIndex: number) => void;
    onSetColumns: (nextColumns: string[], hideTimeColumn: boolean) => void;
};
