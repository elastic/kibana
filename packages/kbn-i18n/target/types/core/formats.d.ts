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
export declare const formats: Formats;
interface NumberFormatOptions<TStyle extends string> extends Intl.NumberFormatOptions {
    style?: TStyle;
    localeMatcher?: 'lookup' | 'best fit';
    currencyDisplay?: 'symbol' | 'code' | 'name';
}
export interface Formats {
    number?: Partial<{
        [key: string]: NumberFormatOptions<'currency' | 'percent' | 'decimal'>;
        currency: NumberFormatOptions<'currency'>;
        percent: NumberFormatOptions<'percent'>;
    }>;
    date?: Partial<{
        [key: string]: DateTimeFormatOptions;
        short: DateTimeFormatOptions;
        medium: DateTimeFormatOptions;
        long: DateTimeFormatOptions;
        full: DateTimeFormatOptions;
    }>;
    time?: Partial<{
        [key: string]: DateTimeFormatOptions;
        short: DateTimeFormatOptions;
        medium: DateTimeFormatOptions;
        long: DateTimeFormatOptions;
        full: DateTimeFormatOptions;
    }>;
    relative?: Partial<{
        [key: string]: {
            style?: 'numeric' | 'best fit';
            units: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
        };
    }>;
}
interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
    weekday?: 'narrow' | 'short' | 'long';
    era?: 'narrow' | 'short' | 'long';
    year?: 'numeric' | '2-digit';
    month?: 'numeric' | '2-digit' | 'narrow' | 'short' | 'long';
    day?: 'numeric' | '2-digit';
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
    timeZoneName?: 'short' | 'long';
}
export {};
//# sourceMappingURL=formats.d.ts.map