import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import { type PricingProductFeature } from '@kbn/core-pricing-common';
import type { InternalHttpServicePreboot, InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { PricingServiceSetup, PricingServiceStart } from '@kbn/core-pricing-server';
interface PrebootDeps {
    http: InternalHttpServicePreboot;
}
interface SetupDeps {
    http: InternalHttpServiceSetup;
}
/** @internal */
export declare class PricingService implements CoreService<PricingServiceSetup, PricingServiceStart> {
    private readonly configService;
    private readonly logger;
    private readonly productFeaturesRegistry;
    private readonly isEvaluated$;
    private readonly isEvaluatedPromise;
    private pricingConfig;
    private tiersClient;
    constructor(core: CoreContext);
    preboot({ http }: PrebootDeps): void;
    setup({ http }: SetupDeps): Promise<{
        /**
         * Evaluates the product features and emits the `isEvaluated$` signal.
         * This should be called after all plugins have registered their features.
         */
        evaluateProductFeatures: () => void;
        /**
         * Checks if a specific feature is available in the current pricing tier configuration.
         * Resolves asynchronously after the pricing service has been set up and all the plugins have registered their features.
         */
        isFeatureAvailable: (featureId: string) => Promise<boolean>;
        registerProductFeatures: (features: PricingProductFeature[]) => void;
    }>;
    start(): {
        isFeatureAvailable: <TFeatureId extends string>(featureId: TFeatureId) => boolean;
        getActiveProduct: () => import("@kbn/core/packages/pricing/common/src/types").PricingProduct | undefined;
    };
    stop(): void;
}
export {};
