import type { ISearchStart } from '../types';
declare function createStartContract(): jest.Mocked<ISearchStart['searchSource']>;
export declare const searchSourceMock: {
    createStartContract: typeof createStartContract;
};
export {};
