import type { IUiSettingsClient } from '@kbn/core/public';
export interface SearchEmbeddableDefaults {
    rowHeight: number | undefined;
    headerRowHeight: number | undefined;
    rowsPerPage: number | undefined;
    sampleSize: number | undefined;
}
export declare const getSearchEmbeddableDefaults: (uiSettings: IUiSettingsClient) => SearchEmbeddableDefaults;
