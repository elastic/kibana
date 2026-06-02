import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { ReactConvertFunction, TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class StringFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES[];
    static transformOptions: ({
        kind: boolean;
        text: string;
    } | {
        kind: string;
        text: string;
    })[];
    getParamDefaults(): {
        transform: boolean;
    };
    private base64Decode;
    private toTitleCase;
    textConvert: TextContextTypeConvert;
    reactConvert: ReactConvertFunction;
}
