import type { CustomFormats } from '@formatjs/intl';
export type Formats = CustomFormats;
/**
 * Default format options used for "en" locale.
 * These are used when constructing the internal Intl.NumberFormat
 * (`number` formatter) and Intl.DateTimeFormat (`date` and `time` formatters) instances.
 * The value of each parameter of `number` formatter is options object which is
 * described in `options` section of [NumberFormat constructor].
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat}
 * The value of each parameter of `date` and `time` formatters is options object which is
 * described in `options` section of [DateTimeFormat constructor].
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat}
 */
export declare const defaultEnFormats: CustomFormats;
