import type { DataViewsPlugin } from '.';
export type Setup = jest.Mocked<ReturnType<DataViewsPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<DataViewsPlugin['start']>>;
export declare const dataViewPluginMocks: {
    createSetupContract: () => Setup;
    createStartContract: () => Start;
};
