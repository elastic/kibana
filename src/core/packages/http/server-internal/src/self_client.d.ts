import type { Logger } from '@kbn/logging';
import type { HttpSelfService, HttpSelfUnauthorizedErrorHandler, HttpServerInfo, IAuthHeadersStorage, IBasePath, KibanaRequest } from '@kbn/core-http-server';
import type { HttpConfig } from './http_config';
/**
 * Returns the UIAM internal-caller attestation for `outboundAuthorization`, or nothing.
 * @internal
 */
export type SelfClientUiamAttestationGetter = (request: KibanaRequest, outboundAuthorization: string | null) => string | undefined;
export declare const SELF_CALL_RECURSION_ERROR = "Refusing Kibana self HTTP call because a self call cannot issue another self call.";
export declare const SELF_CALL_MTLS_ERROR = "Kibana self HTTP calls do not support local calls when server.ssl.clientAuthentication is required.";
interface HttpSelfClientParams {
    readonly basePath: IBasePath;
    readonly authRequestHeaders: IAuthHeadersStorage;
    readonly getServerInfo: () => HttpServerInfo;
    readonly getHttpConfig: () => HttpConfig;
    readonly kibanaVersion: string;
    readonly log: Logger;
    readonly target: 'auto' | 'local';
    readonly getUiamAttestationGetter?: () => SelfClientUiamAttestationGetter | undefined;
    readonly getUnauthorizedErrorHandler?: () => HttpSelfUnauthorizedErrorHandler | undefined;
}
export interface InternalHttpSelfService extends HttpSelfService {
    close(): Promise<void>;
}
export declare const createInternalHttpSelfClient: (params: HttpSelfClientParams) => InternalHttpSelfService;
export {};
