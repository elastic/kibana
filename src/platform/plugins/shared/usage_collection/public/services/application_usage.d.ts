import type { Observable } from 'rxjs';
import type { ApplicationUsageTracker } from '@kbn/analytics';
export declare function trackApplicationUsageChange(currentAppId$: Observable<string | undefined>, applicationUsageTracker: Pick<ApplicationUsageTracker, 'updateViewClickCounter' | 'setCurrentAppId' | 'trackApplicationViewUsage'>): import("rxjs").Subscription[];
