import type { RequestAdapter } from './request';
/**
 * The interface that the adapters used to open an inspector have to fullfill.
 */
export interface Adapters {
    requests?: RequestAdapter;
    [key: string]: any;
}
