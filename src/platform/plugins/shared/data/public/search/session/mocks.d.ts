import type { ISessionsClient } from './sessions_client';
import type { ISessionService } from './session_service';
import type { PersistedSearchSessionSavedObjectAttributes } from './sessions_mgmt/types';
import type { ISearchSessionEBTManager } from './ebt_manager';
export declare function getSessionsClientMock(overrides?: Partial<jest.Mocked<ISessionsClient>>): jest.Mocked<ISessionsClient>;
export declare function getSessionServiceMock(overrides?: Partial<jest.Mocked<ISessionService>>): jest.Mocked<ISessionService>;
export declare const getPersistedSearchSessionSavedObjectAttributesMock: (overrides?: Partial<PersistedSearchSessionSavedObjectAttributes>) => PersistedSearchSessionSavedObjectAttributes;
export declare function getSearchSessionEBTManagerMock(): jest.Mocked<ISearchSessionEBTManager>;
