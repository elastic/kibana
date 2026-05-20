import type { HttpResponse, HttpSetup } from '@kbn/core/public';
export declare function getVersion(): string[];
export declare function getContentType(body: unknown): "application/json" | undefined;
interface SendConfig {
    http: HttpSetup;
    method: string;
    path: string;
    data?: string;
    asSystemRequest?: boolean;
    withProductOrigin?: boolean;
    asResponse?: boolean;
    host?: string;
    isPackagedEnvironment?: boolean;
}
export declare function send({ http, method, path, data, asSystemRequest, withProductOrigin, asResponse, host, isPackagedEnvironment, }: SendConfig): Promise<HttpResponse<unknown>>;
export declare function constructUrl(baseUri: string, path: string): string;
export {};
