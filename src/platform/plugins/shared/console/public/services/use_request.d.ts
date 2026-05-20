import type { SendRequestConfig, SendRequestResponse, Error } from '../shared_imports';
export declare const sendRequest: <T = any, E = Error>(config: SendRequestConfig) => Promise<SendRequestResponse<T, E>>;
