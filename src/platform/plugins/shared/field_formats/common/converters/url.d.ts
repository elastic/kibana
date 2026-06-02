import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { ReactConvertFunction, TextContextTypeConvert, FieldFormatMetaParams, FieldFormatParams } from '../types';
import { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class UrlFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES[];
    static urlTypes: {
        kind: string;
        text: string;
    }[];
    constructor(params: FieldFormatParams & FieldFormatMetaParams);
    getParamDefaults(): {
        type: string;
        urlTemplate: null;
        labelTemplate: null;
        width: null;
        height: null;
    };
    private formatLabel;
    private formatUrl;
    private compileTemplate;
    textConvert: TextContextTypeConvert;
    reactConvert: ReactConvertFunction;
}
