import type { ReactNode } from 'react';
import type { FieldFormatsGetConfigFn, FieldFormatsContentType, FieldFormatInstanceType, FieldFormatConvert, FieldFormatConvertFunction, TextContextTypeOptions, FieldFormatMetaParams, FieldFormatParams } from './types';
import type { ReactContextTypeConvert, ReactContextTypeSingleConvert, TextContextTypeConvert } from './types';
export declare abstract class FieldFormat {
    /**
     * @property {string} - Field Format Id
     * @static
     * @public
     */
    static id: string;
    /**
     * Hidden field formats can only be accessed directly by id,
     * They won't appear in field format editor UI,
     * But they can be accessed and used from code internally.
     *
     * @property {boolean} -  Is this a hidden field format
     * @static
     * @public
     */
    static hidden: boolean;
    /**
     * @property {string} -  Field Format Title
     * @static
     * @public
     */
    static title: string;
    /**
     * @property {string} - Field Format Type
     * @internal
     */
    static fieldType: string | string[];
    /**
     * @property {FieldFormatConvert}
     * @internal
     * have to remove the private because of
     * https://github.com/Microsoft/TypeScript/issues/17293
     */
    convertObject: FieldFormatConvert | undefined;
    /**
     * Single-value React converter. Override this in subclasses to customize React rendering
     * for individual (non-array) values. The public `reactConvert` method handles array
     * wrapping automatically and delegates here for scalar values.
     *
     * @property {reactConvertSingle}
     * @protected
     */
    protected reactConvertSingle: ReactContextTypeSingleConvert | undefined;
    /**
     * React-based converter. Handles arrays and delegates single values to `reactConvertSingle`
     * (if overridden) or the default text/highlight logic.
     *
     * Do NOT override this method in subclasses — override `reactConvertSingle` instead so that
     * array handling is always applied correctly.
     *
     * @property {reactConvert}
     * @protected
     */
    reactConvert: ReactContextTypeConvert;
    /**
     * @property {textConvert}
     * @protected
     */
    protected textConvert: TextContextTypeConvert | undefined;
    /**
     * @property {Function} - ref to child class
     * @internal
     */
    type: typeof FieldFormat;
    allowsNumericalAggregations?: boolean;
    protected readonly _params: FieldFormatParams & FieldFormatMetaParams;
    protected getConfig: FieldFormatsGetConfigFn | undefined;
    constructor(_params?: FieldFormatParams & FieldFormatMetaParams, getConfig?: FieldFormatsGetConfigFn);
    /**
     * Convert a raw value to a formatted string
     * @param  {unknown} value
     * @param  {string} [contentType=text] - optional content type which helps
     *                                formatters adjust to different contexts
     * @return {string} - the formatted string
     * @public
     */
    convert(value: unknown, contentType?: FieldFormatsContentType, options?: TextContextTypeOptions): string;
    /**
     * Get a convert function that is bound to a specific contentType
     * @param  {string} [contentType=text]
     * @return {function} - a bound converter function
     * @public
     */
    getConverterFor(contentType?: FieldFormatsContentType): FieldFormatConvertFunction;
    /**
     * Get parameter defaults
     * @return {object} - parameter defaults
     * @public
     */
    getParamDefaults(): FieldFormatParams;
    /**
     * Get the value of a param. This value may be a default value.
     *
     * @param  {string} name - the param name to fetch
     * @return {any} TODO: https://github.com/elastic/kibana/issues/108158
     * @public
     */
    param(name: string): any;
    /**
     * Get all of the params in a single object
     * @return {object}
     * @public
     */
    params(): FieldFormatParams & FieldFormatMetaParams;
    /**
     * Serialize this format to a simple POJO, with only the params
     * that are not default
     *
     * @return {object}
     * @public
     */
    toJSON(): {
        id: string;
        params: (import("@kbn/utility-types").SerializableRecord & FieldFormatMetaParams) | undefined;
    };
    static from(convertFn: FieldFormatConvertFunction): FieldFormatInstanceType;
    setupContentType(): FieldFormatConvert;
    static isInstanceOfFieldFormat(fieldFormat: unknown): fieldFormat is FieldFormat;
    protected checkForMissingValueText(val: unknown): string | void;
    protected checkForMissingValueReact(val: unknown): ReactNode | void;
}
