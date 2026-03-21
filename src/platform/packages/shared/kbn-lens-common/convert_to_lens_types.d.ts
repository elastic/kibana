import type { GenericIndexPatternColumn } from './datasources/types';
import type { LensConfiguration } from './visualizations/types';
type ToBaseColumnFormat<Col extends GenericIndexPatternColumn> = {
    columnId: string;
    isSplit: boolean;
} & Omit<Col, 'label'> & {
    label?: string;
};
type LensColumn = ToBaseColumnFormat<GenericIndexPatternColumn> & {
    params?: Record<string, unknown>;
};
export interface NavigateToLensLayer {
    indexPatternId: string;
    layerId: string;
    columns: LensColumn[];
    columnOrder: string[];
    ignoreGlobalFilters: boolean;
}
export interface NavigateToLensContext<T extends LensConfiguration = LensConfiguration> {
    layers: NavigateToLensLayer[];
    type: string;
    configuration: T;
    indexPatternIds: string[];
}
export {};
