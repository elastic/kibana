import type { DataPlugin } from '.';
export type Setup = jest.Mocked<ReturnType<DataPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<DataPlugin['start']>>;
export { createSearchSourceMock } from '../common/search/search_source/mocks';
export { getCalculateAutoTimeExpression } from '../common/search/aggs';
export declare const dataPluginMock: {
    createSetupContract: () => Setup;
    createStartContract: () => Start;
};
