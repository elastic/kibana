import type { HttpStart } from '@kbn/core-http-browser';
import type { RecentlyAccessed } from './types';
interface StartDeps {
    key: string;
    http: Pick<HttpStart, 'basePath'>;
}
export declare class RecentlyAccessedService {
    start({ http, key }: StartDeps): RecentlyAccessed;
}
export {};
