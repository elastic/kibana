import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { TextContextTypeConvert } from '../types';
import type { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class SourceFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES;
    textConvert: TextContextTypeConvert;
}
