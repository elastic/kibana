import type { IoTsParamsObject } from '@kbn/server-route-repository-utils';
import type * as t from 'io-ts';
export declare function decodeRequestParams<T extends IoTsParamsObject>(params: Partial<{
    path: any;
    query: any;
    body: any;
}>, paramsRt: T): t.OutputOf<T>;
