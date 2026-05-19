import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalPrebootServicePreboot } from './types';
/** @internal */
export declare class PrebootService {
    private readonly core;
    private readonly promiseList;
    private waitUntilCanSetupPromise?;
    private isSetupOnHold;
    private readonly log;
    constructor(core: CoreContext);
    preboot(): InternalPrebootServicePreboot;
    stop(): void;
}
