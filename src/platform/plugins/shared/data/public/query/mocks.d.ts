import type { PublicMethodsOf } from '@kbn/utility-types';
import type { QueryService, QuerySetup, QueryStart } from '.';
type QueryServiceClientContract = PublicMethodsOf<QueryService>;
export declare const queryServiceMock: {
    create: () => jest.Mocked<QueryServiceClientContract>;
    createSetupContract: () => jest.Mocked<QuerySetup>;
    createStartContract: () => jest.Mocked<QueryStart>;
};
export {};
