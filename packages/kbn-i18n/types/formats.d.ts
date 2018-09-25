declare module 'kbn-i18n-formats' {
  export interface IFormats {
    number?: {
      [key: string]:
        | {
            style?: 'currency' | 'percent' | 'decimal';
            currency?: string;
          } & CommonStyleNumber
        | undefined;
      currency?: {
        style: 'currency';
        currency?: string;
      } & CommonStyleNumber;
      percent?: {
        style: 'percent';
        currency?: string;
      } & CommonStyleNumber;
    };
    date?: {
      [key: string]: CommonStyleDate | undefined;
      short?: CommonStyleDate;
      medium?: CommonStyleDate;
      long?: CommonStyleDate;
      full?: CommonStyleDate;
    };
    time?: {
      [key: string]: CommonStyleDate | undefined;
      short?: CommonStyleDate;
      medium?: CommonStyleDate;
      long?: CommonStyleDate;
      full?: CommonStyleDate;
    };
  }

  interface CommonStyleNumber {
    localeMatcher?: 'lookup' | 'best fit';
    currencyDisplay?: 'symbol' | 'code' | 'name';
    useGrouping?: boolean;
    minimumIntegerDigits?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    minimumSignificantDigits?: number;
    maximumSignificantDigits?: number;
  }

  interface CommonStyleDate {
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
}
