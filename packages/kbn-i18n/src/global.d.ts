declare module 'intl-format-cache' {
  interface Message {
    format: (values: any) => string;
  }

  function memoizeIntlConstructor(IntlMessageFormat: any): (msg: string, locale: string, formats: any) => Message;
  export = memoizeIntlConstructor;
}

declare module 'intl-relativeformat' {
  export let defaultLocale: string;
}
