import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class HistogramFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static fieldType: KBN_FIELD_TYPES;
    static title: string;
    id: FIELD_FORMAT_IDS;
    title: string;
    allowsNumericalAggregations: boolean;
    getParamDefaults(): {
        id: string;
        params: {};
    };
    textConvert: TextContextTypeConvert;
}
