import type { GetAlertFieldsResponse } from '@kbn/alerting-types';
import type { FetchUnifiedAlertsFieldsParams } from './types';
export declare const fetchUnifiedAlertsFields: ({ http, ruleTypeIds }: FetchUnifiedAlertsFieldsParams) => Promise<GetAlertFieldsResponse>;
