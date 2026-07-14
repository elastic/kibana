import type { URL } from 'url';
import type { Request, RouteOptionsPayload } from '@hapi/hapi';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { KibanaRouteOptions } from './request';
import type { Headers } from './headers';
/**
 * Represents a fake raw request.
 * Can be used to instantiate a `KibanaRequest`.
 */
export interface FakeRawRequest {
    /** The headers associated with the request. */
    headers: Headers;
    /** The path of the request. Defaults to `/` when omitted. */
    path?: string;
    /** The space this request is scoped to. Defaults to the default space when omitted. */
    spaceId?: SpaceId;
    method?: string;
    url?: URL;
    app?: Record<string, unknown>;
    auth?: {
        isAuthenticated?: boolean;
    };
    route?: {
        settings?: {
            tags?: string[];
            app?: KibanaRouteOptions;
            payload?: RouteOptionsPayload;
        };
    };
}
export type RawRequest = Request | FakeRawRequest;
