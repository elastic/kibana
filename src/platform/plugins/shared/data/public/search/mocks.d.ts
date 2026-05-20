import type { ISearchSetup, ISearchStart } from './types';
declare function createSetupContract(): jest.Mocked<ISearchSetup>;
declare function createStartContract(overrides?: Partial<jest.Mocked<ISearchStart>>): jest.Mocked<ISearchStart>;
export declare const searchServiceMock: {
    createSetupContract: typeof createSetupContract;
    createStartContract: typeof createStartContract;
};
export {};
