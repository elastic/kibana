import type { Logger } from '@kbn/logging';
import type { HttpConfig } from './http_config';
export declare class HttpsRedirectServer {
    private readonly log;
    private server?;
    constructor(log: Logger);
    start(config: HttpConfig): Promise<void>;
    stop(): Promise<void>;
}
