import type { HttpSetup } from '@kbn/core/public';
import type { SendRequestConfig } from './send_request';
export interface UseRequestConfig extends SendRequestConfig {
    pollIntervalMs?: number;
    initialData?: any;
    deserializer?: (data: any) => any;
}
export interface UseRequestResponse<D = any, E = Error> {
    isInitialRequest: boolean;
    isLoading: boolean;
    error: E | null;
    data?: D | null;
    resendRequest: () => void;
}
export declare const useRequest: <D = any, E = Error>(httpClient: HttpSetup, { path, method, query, body, pollIntervalMs, initialData, deserializer, version, }: UseRequestConfig) => UseRequestResponse<D, E>;
