/* eslint-disable @kbn/eslint/require-license-header,prettier/prettier,eqeqeq,no-nested-ternary,one-var,no-var */

// https://formatjs.io/docs/polyfills/intl-pluralrules/
require('@formatjs/intl-pluralrules/polyfill');
require('@formatjs/intl-pluralrules/locale-data/en');
require('@formatjs/intl-pluralrules/locale-data/zh');
require('@formatjs/intl-pluralrules/locale-data/ja');
require('@formatjs/intl-pluralrules/locale-data/fr');


require('@formatjs/intl-relativetimeformat/polyfill')
require('@formatjs/intl-relativetimeformat/locale-data/en');
require('@formatjs/intl-relativetimeformat/locale-data/zh');
require('@formatjs/intl-relativetimeformat/locale-data/ja');
require('@formatjs/intl-relativetimeformat/locale-data/fr');


// import {shouldPolyfill} from '@formatjs/intl-pluralrules/should-polyfill'
// async function polyfill(locale) {
//   const unsupportedLocale = shouldPolyfill(locale)
//   // This locale is supported
//   if (!unsupportedLocale) {
//     return
//   }
//   // Load the polyfill 1st BEFORE loading data
//   await import('@formatjs/intl-pluralrules/polyfill-force')
//   await import(`@formatjs/intl-pluralrules/locale-data/${unsupportedLocale}`)
// }
