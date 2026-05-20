import type { Reducer } from 'react';
import type { RequestResult } from '../hooks/use_send_current_request/send_request';
export type Actions = {
    type: 'sendRequest';
    payload: undefined;
} | {
    type: 'cleanRequest';
    payload: undefined;
} | {
    type: 'requestSuccess';
    payload: {
        data: RequestResult[];
    };
} | {
    type: 'requestFail';
    payload: RequestResult<string> | undefined;
};
export interface Store {
    requestInFlight: boolean;
    lastResult: {
        data: RequestResult[] | null;
        error?: RequestResult<string>;
    };
}
export declare const initialValue: Store;
export declare const reducer: Reducer<Store, Actions>;
