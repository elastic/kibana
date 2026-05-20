import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { ReactContextTypeSingleConvert, TextContextTypeConvert } from '../types';
export declare abstract class NumeralFormat extends FieldFormat {
    static fieldType: KBN_FIELD_TYPES;
    abstract id: string;
    abstract title: string;
    getParamDefaults: () => {
        pattern: import("@kbn/utility-types").Serializable;
        alwaysShowSign: boolean;
    };
    protected getConvertedValue(val: unknown): string;
    reactConvertSingle: ReactContextTypeSingleConvert;
    textConvert: TextContextTypeConvert;
}
