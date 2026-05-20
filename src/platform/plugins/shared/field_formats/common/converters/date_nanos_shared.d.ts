import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Moment } from 'moment';
import { FieldFormat, FIELD_FORMAT_IDS } from '..';
import type { TextContextTypeConvert } from '../types';
interface FractPatternObject {
    length: number;
    patternNanos: string;
    pattern: string;
    patternEscaped: string;
}
/**
 * Analyse the given moment.js format pattern for the fractional sec part (S,SS,SSS...)
 * returning length, match, pattern and an escaped pattern, that excludes the fractional
 * part when formatting with moment.js -> e.g. [SSS]
 */
export declare function analysePatternForFract(pattern: string): FractPatternObject;
/**
 * Format a given moment.js date object
 * Since momentjs would loose the exact value for fractional seconds with a higher resolution than
 * milliseconds, the fractional pattern is replaced by the fractional value of the raw timestamp
 */
export declare function formatWithNanos(dateMomentObj: Moment, valRaw: string, fracPatternObj: FractPatternObject): string;
export declare class DateNanosFormat extends FieldFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    static fieldType: KBN_FIELD_TYPES;
    protected memoizedConverter: Function;
    protected memoizedPattern: string;
    protected timeZone: string;
    getParamDefaults(): {
        pattern: import("@kbn/utility-types").Serializable;
        fallbackPattern: import("@kbn/utility-types").Serializable;
        timezone: import("@kbn/utility-types").Serializable;
    };
    textConvert: TextContextTypeConvert;
}
export {};
