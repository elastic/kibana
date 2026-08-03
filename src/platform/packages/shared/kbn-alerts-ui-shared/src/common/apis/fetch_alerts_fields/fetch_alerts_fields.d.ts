import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import type { BrowserFields } from '@kbn/alerting-types';
import type { FetchAlertsFieldsParams } from './types';
export declare const fetchAlertsFields: ({ http, ruleTypeIds }: FetchAlertsFieldsParams) => Promise<{
    browserFields: BrowserFields;
    fields: FieldDescriptor[];
}>;
