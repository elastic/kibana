import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { type Observable } from 'rxjs';
export declare function registerAnalyticsContextProvider({ analytics, location$, }: {
    analytics: AnalyticsServiceSetup;
    location$: Observable<string>;
}): void;
