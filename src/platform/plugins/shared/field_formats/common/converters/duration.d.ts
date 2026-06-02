import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';
export declare class DurationFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES;
    static inputFormats: {
        text: string;
        kind: string;
    }[];
    static outputFormats: ({
        text: string;
        method: string;
        shortText?: undefined;
    } | {
        text: string;
        shortText: string;
        method: string;
    })[];
    allowsNumericalAggregations: boolean;
    isHuman(): boolean;
    isHumanPrecise(): boolean;
    getParamDefaults(): {
        inputFormat: string;
        outputFormat: string;
        outputPrecision: number;
        includeSpaceWithSuffix: boolean;
    };
    textConvert: TextContextTypeConvert;
}
