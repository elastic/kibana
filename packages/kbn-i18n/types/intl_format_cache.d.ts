declare module 'intl-format-cache' {
  import { IFormats } from 'kbn-i18n-formats';

  interface Message {
    format: (values: { [key: string]: string | number | Date }) => string;
  }

  function memoizeIntlConstructor(
    IntlMessageFormat: any
  ): (msg: string, locale: string, formats: IFormats) => Message;
  export = memoizeIntlConstructor;
}
