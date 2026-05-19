import type { Observable } from 'rxjs';
import type { IRouter, ServiceStatus } from '@kbn/core/server';
import { type MetricsServiceSetup } from '@kbn/core/server';
import type { ICollectorSet } from '../../collector';
export declare function registerStatsRoute({ router, config, collectorSet, metrics, overallStatus$, }: {
    router: IRouter;
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
