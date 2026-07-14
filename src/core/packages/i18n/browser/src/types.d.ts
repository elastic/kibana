import type React from 'react';
/**
 * I18nStart.Context is required by any localizable React component from \@kbn/i18n and \@elastic/eui packages
 * and is supposed to be used as the topmost component for any i18n-compatible React tree.
 *
 * @public
 */
export interface I18nStart {
    /**
     * React Context provider required as the topmost component for any i18n-compatible React tree.
     */
    Context: ({ children }: {
        children: React.ReactNode;
    }) => JSX.Element;
}
