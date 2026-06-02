import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { ReactConvertFunction, TextContextTypeConvert } from '../types';
import type { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class StaticLookupFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES[];
    getParamDefaults(): {
        lookupEntries: {}[];
        unknownKeyValue: null;
    };
    private lookup;
    textConvert: TextContextTypeConvert;
    reactConvert: ReactConvertFunction;
}
