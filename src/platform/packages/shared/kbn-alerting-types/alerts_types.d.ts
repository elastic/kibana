import type { TechnicalRuleDataFieldName } from '@kbn/rule-data-utils';
import type { JsonValue } from '@kbn/utility-types';
export interface MetaAlertFields {
    _id: string;
    _index: string;
    _score?: number;
}
export interface LegacyField {
    field: string;
    value: Array<string | number>;
}
export interface EsQuerySnapshot {
    request: string[];
    response: string[];
}
export type KnownAlertFields = {
    [Property in TechnicalRuleDataFieldName]?: JsonValue[];
};
export type UnknownAlertFields = Record<string, string | number | JsonValue[]>;
/**
 * Alert document type as returned by alerts search requests
 *
 * Use the AdditionalFields type parameter to add additional fields to the alert type
 */
export type Alert<AdditionalFields extends UnknownAlertFields = UnknownAlertFields> = KnownAlertFields & AdditionalFields & MetaAlertFields;
