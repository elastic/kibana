import type { PublicMethodsOf } from '@kbn/utility-types';
import type { TimefilterService, TimeHistoryContract, TimefilterContract } from '.';
export type TimefilterServiceClientContract = PublicMethodsOf<TimefilterService>;
export declare const timefilterServiceMock: {
    create: () => jest.Mocked<TimefilterServiceClientContract>;
    createSetupContract: () => {
        timefilter: jest.Mocked<TimefilterContract>;
        history: jest.Mocked<TimeHistoryContract>;
    };
    createStartContract: () => {
        timefilter: jest.Mocked<TimefilterContract>;
        history: jest.Mocked<TimeHistoryContract>;
    };
};
