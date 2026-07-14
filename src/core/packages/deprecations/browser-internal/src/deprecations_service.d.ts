import type { CoreService } from '@kbn/core-base-browser-internal';
import type { DeprecationsServiceStart } from '@kbn/core-deprecations-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
export declare class DeprecationsService implements CoreService<void, DeprecationsServiceStart> {
    setup(): void;
    start({ http }: {
        http: InternalHttpStart;
    }): DeprecationsServiceStart;
    stop(): void;
}
