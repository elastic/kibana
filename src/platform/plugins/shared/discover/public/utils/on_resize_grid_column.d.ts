import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
export declare const onResizeGridColumn: (colSettings: {
    columnId: string;
    width: number | undefined;
}, gridState: DiscoverGridSettings | undefined) => DiscoverGridSettings;
