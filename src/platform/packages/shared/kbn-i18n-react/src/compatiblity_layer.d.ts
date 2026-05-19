import type { PropsWithChildren, FC } from 'react';
import React from 'react';
import type { IntlShape } from 'react-intl';
export interface FormattedRelativeProps {
    value: Date | number | string;
    updateIntervalInSeconds?: number;
}
/**
 * Mimic `FormattedRelative` previous behavior from formatJS v2
 */
export declare const FormattedRelative: ({ value: valueInput, updateIntervalInSeconds, }: FormattedRelativeProps) => React.JSX.Element;
/**
 * Added for now while doing the i18n upgrade.
 * TODO: remove in a separate PR and update the 200+ test files we have using this to simply
 * use the `I18nProvider` and the `IntlShape` instead of `InjectedIntl`.
 */
export declare const __IntlProvider: FC<PropsWithChildren<{
    locale?: string;
    messages?: unknown;
}>>;
export type InjectedIntl = IntlShape;
