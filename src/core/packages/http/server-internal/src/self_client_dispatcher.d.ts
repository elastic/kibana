import { type Dispatcher } from 'undici';
import type { IBasePath } from '@kbn/core-http-server';
import type { HttpConfig } from './http_config';
interface SelfHttpDispatcherProviderParams {
    readonly basePath: IBasePath;
    readonly getHttpConfig: () => HttpConfig;
    readonly target: 'auto' | 'local';
}
export declare class SelfHttpDispatcherProvider {
    private readonly params;
    private readonly dispatchers;
    constructor(params: SelfHttpDispatcherProviderParams);
    get(url: URL, target: 'local' | 'public'): Dispatcher | undefined;
    close(): Promise<void>;
    private replaceDispatcher;
}
export {};
