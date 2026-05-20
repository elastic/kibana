import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { FIELD_FORMAT_IDS } from '../../../common';
import { FieldFormat } from '../../../common';
import type { TextContextTypeConvert } from '../../../common/types';
export declare class DateFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES;
    private memoizedConverter;
    private memoizedPattern;
    private timeZone;
    getParamDefaults(): {
        pattern: import("@kbn/utility-types").Serializable;
        timezone: import("@kbn/utility-types").Serializable;
    };
    textConvert: TextContextTypeConvert;
}
