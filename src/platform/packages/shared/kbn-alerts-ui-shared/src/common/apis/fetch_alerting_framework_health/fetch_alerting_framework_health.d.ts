import type { HttpSetup } from '@kbn/core/public';
import type { AlertingFrameworkHealth } from '@kbn/alerting-types';
export declare function fetchAlertingFrameworkHealth({ http, }: {
    http: HttpSetup;
}): Promise<AlertingFrameworkHealth>;
