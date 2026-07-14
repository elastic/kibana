import type { ResponseObject as HapiResponseObject, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import Boom from '@hapi/boom';
import { KibanaResponse } from './response';
export declare class HapiResponseAdapter {
    private readonly responseToolkit;
    constructor(responseToolkit: HapiResponseToolkit);
    toBadRequest(message: string): Boom.Boom<unknown>;
    toInternalError(): Boom.Boom<any>;
    handle(kibanaResponse: KibanaResponse): HapiResponseObject | Boom.Boom<any>;
    private toHapiResponse;
    private toSuccess;
    private toRedirect;
    private toError;
}
