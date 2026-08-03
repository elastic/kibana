import type { DataSourceProfileProvider } from '../../../../profiles';
import type { DefaultAppStateColumn } from '../../../../types';
export interface CreateGetDefaultAppStateParams {
    defaultColumns?: DefaultAppStateColumn[];
}
export declare const createGetDefaultAppState: ({ defaultColumns, }?: CreateGetDefaultAppStateParams) => DataSourceProfileProvider["profile"]["getDefaultAppState"];
