import { NumeralFormat } from './numeral';
import type { TextContextTypeConvert } from '../types';
import type { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class PercentFormat extends NumeralFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    id: FIELD_FORMAT_IDS;
    title: string;
    allowsNumericalAggregations: boolean;
    getParamDefaults: () => {
        pattern: import("@kbn/utility-types").Serializable;
        fractional: boolean;
        alwaysShowSign: boolean;
    };
    textConvert: TextContextTypeConvert;
}
