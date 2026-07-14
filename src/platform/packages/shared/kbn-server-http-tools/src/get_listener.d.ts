import type { IHttpConfig, ServerListener } from './types';
interface GetServerListenerOptions {
    configureTLS?: boolean;
}
export declare function getServerListener(config: IHttpConfig, options?: GetServerListenerOptions): ServerListener;
export {};
