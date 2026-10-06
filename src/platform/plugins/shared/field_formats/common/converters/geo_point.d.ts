import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class GeoPointFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES[];
    static transformOptions: {
        kind: string;
        text: string;
    }[];
    getParamDefaults(): {
        transform: string;
    };
    textConvert: TextContextTypeConvert;
}
