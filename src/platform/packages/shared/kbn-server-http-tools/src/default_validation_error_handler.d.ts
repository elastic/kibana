import type { Lifecycle, Request, ResponseToolkit, Utils } from '@hapi/hapi';
import type { ValidationError } from 'joi';
/**
 * Hapi extends the ValidationError interface to add this output key with more data.
 */
export interface HapiValidationError extends ValidationError {
    output: {
        statusCode: number;
        headers: Utils.Dictionary<string | string[]>;
        payload: {
            statusCode: number;
            error: string;
            message?: string;
            validation: {
                source: string;
                keys: string[];
            };
        };
    };
}
/**
 * Used to replicate Hapi v16 and below's validation responses. Should be used in the routes.validate.failAction key.
 */
export declare function defaultValidationErrorHandler(request: Request, h: ResponseToolkit, err?: Error): Lifecycle.ReturnValue;
