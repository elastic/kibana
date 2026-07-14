import type { IRouter, ISavedObjectsRepository, ServiceStatus } from '@kbn/core/server';
import { type MetricsServiceSetup } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { ICollectorSet } from '../collector';
import type { UsageCountersServiceSetup } from '../usage_counters';
export declare function setupRoutes({ router, usageCounters, getSavedObjects, ...rest }: {
    router: IRouter;
    getSavedObjects: () => ISavedObjectsRepository | undefined;
    usageCounters: UsageCountersServiceSetup;
    config: {
        allowAnonymous: boolean;
        kibanaIndex: string;
        kibanaVersion: string;
        uuid: string;
        server: {
            name: string;
            hostname: string;
            port: number;
        };
    };
    collectorSet: ICollectorSet;
    metrics: MetricsServiceSetup;
    overallStatus$: Observable<ServiceStatus>;
}): void;
