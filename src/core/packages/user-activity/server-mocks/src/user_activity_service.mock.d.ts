import type { UserActivityServiceSetup, UserActivityServiceStart } from '@kbn/core-user-activity-server';
import type { InternalUserActivityServiceSetup, InternalUserActivityServiceStart } from '@kbn/core-user-activity-server-internal';
export declare const userActivityServiceMock: {
    createInternalSetupContract: () => jest.Mocked<InternalUserActivityServiceSetup>;
    createInternalStartContract: () => jest.Mocked<InternalUserActivityServiceStart>;
    createSetupContract: () => jest.Mocked<UserActivityServiceSetup>;
    createStartContract: () => jest.Mocked<UserActivityServiceStart>;
};
