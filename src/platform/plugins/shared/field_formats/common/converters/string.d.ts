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
    /**
     * Applies the selected transform (if any) to the highlighted snippets so they still align with
     * the transformed field value. Only case transforms (lower/upper/title) are handled: they
     * preserve character positions, so each snippet can be transformed as a whole. Short Dots,
     *  Base64 and URL Param move characters around, so they are left out and their highlights are simply dropped.
     */
    private applyTransformsToHighlightHit;
}
