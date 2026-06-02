import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { ReactConvertFunction, TextContextTypeConvert } from '../types';
import type { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class ColorFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES[];
    getParamDefaults(): {
        fieldType: null;
        colors: {
            range: string;
            regex: string;
            text: string;
            background: string;
            boolean: string;
        }[];
    };
    findColorRuleForVal(val: string | number | boolean): any;
    textConvert: TextContextTypeConvert;
    reactConvert: ReactConvertFunction;
}
