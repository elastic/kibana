import type { IntlShape, WrappedComponentProps } from 'react-intl';
import { FormattedDate, FormattedTime, FormattedNumber, FormattedPlural, FormattedMessage, FormattedRelativeTime } from 'react-intl';
export type { IntlShape, WrappedComponentProps };
export { FormattedDate, FormattedTime, FormattedNumber, FormattedPlural, FormattedMessage, FormattedRelativeTime, };
export { FormattedRelative, __IntlProvider } from './src/compatiblity_layer';
export type { FormattedRelativeProps, InjectedIntl } from './src/compatiblity_layer';
export { I18nProvider } from './src/provider';
export { injectI18n, useI18n } from './src/inject';
