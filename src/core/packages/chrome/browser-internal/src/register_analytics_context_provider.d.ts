import { type Observable } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
/**
 * Registers the Analytics context provider to enrich events with the page title.
 * @param analytics Analytics service.
 * @param pageTitle$ Observable emitting the page title.
 * @internal
 */
export declare function registerAnalyticsContextProvider(analytics: AnalyticsServiceSetup, pageTitle$: Observable<string>): void;
