import type { PublicMethodsOf } from '@kbn/utility-types';
export type NowProviderInternalContract = PublicMethodsOf<NowProvider>;
export type NowProviderPublicContract = Pick<NowProviderInternalContract, 'get'>;
/**
 * Used to synchronize time between parallel searches with relative time range that rely on `now`.
 */
export declare class NowProvider {
    private readonly nowFromUrl;
    private now?;
    constructor();
    get(): Date;
    set(now: Date): void;
    reset(): void;
}
