import type { EcsMetadata } from '@kbn/alerts-as-data-utils/src/field_maps/types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { GetBrowserFieldsResponse } from '@kbn/alerting-types';
export declare const getDescription: (fieldName: string, ecsFlat: Record<string, EcsMetadata>) => string;
export declare const fetchRuleTypeAlertFields: ({ http, ruleTypeId, }: {
    http: HttpStart;
    ruleTypeId?: string;
}) => Promise<GetBrowserFieldsResponse["fields"]>;
