import type { RewriteRequestCase } from '@kbn/actions-types';
import type { AlertingFrameworkHealth, AlertsHealth } from '@kbn/alerting-types';
export declare const transformAlertsHealthResponse: RewriteRequestCase<AlertsHealth>;
export declare const transformAlertingFrameworkHealthResponse: RewriteRequestCase<AlertingFrameworkHealth>;
