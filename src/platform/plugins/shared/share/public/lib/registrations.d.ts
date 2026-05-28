import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
interface SetupDeps {
    analytics: AnalyticsServiceSetup;
}
export declare const registrations: {
    setup(deps: SetupDeps): void;
};
export {};
