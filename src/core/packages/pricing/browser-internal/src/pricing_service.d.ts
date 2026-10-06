import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { PricingServiceStart } from '@kbn/core-pricing-browser';
import type { CoreService } from '@kbn/core-base-browser-internal';
interface StartDeps {
    http: InternalHttpStart;
}
/**
 * Service that is responsible for UI Pricing.
 * @internal
 */
export declare class PricingService implements CoreService<{}, PricingServiceStart> {
    setup(): {};
    start({ http }: StartDeps): Promise<PricingServiceStart>;
    stop(): Promise<void>;
}
export {};
