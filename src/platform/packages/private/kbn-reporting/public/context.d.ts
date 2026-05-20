import type { HttpSetup } from '@kbn/core/public';
import { type FC, type PropsWithChildren } from 'react';
import type { ReportingAPIClient } from './reporting_api_client';
interface ContextValue {
    http: HttpSetup;
    apiClient: ReportingAPIClient;
}
export declare const InternalApiClientProvider: FC<PropsWithChildren<{
    apiClient: ReportingAPIClient;
    http: HttpSetup;
}>>;
export declare const useInternalApiClient: () => ContextValue;
export {};
