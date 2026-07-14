import type { FC, PropsWithChildren } from 'react';
/**
 * The library uses the provider pattern to scope an i18n context to a tree
 * of components. This component is used to setup the i18n context for a tree.
 * IntlProvider should wrap react app's root component (inside each react render method).
 */
export declare const I18nProvider: FC<PropsWithChildren<unknown>>;
