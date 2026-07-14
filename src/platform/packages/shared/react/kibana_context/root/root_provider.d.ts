import type { FC, PropsWithChildren } from 'react';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { CoreEnv } from '@kbn/core-base-browser-internal';
import type { ChromeStart } from '@kbn/core-chrome-browser';
import { type KibanaEuiProviderProps } from './eui_provider';
/** Props for the KibanaRootContextProvider */
export interface KibanaRootContextProviderProps extends KibanaEuiProviderProps {
    /** The `I18nStart` API from `CoreStart`. */
    i18n: I18nStart;
    /** The `AnalyticsServiceStart` API from `CoreStart`. */
    analytics?: Pick<AnalyticsServiceStart, 'reportEvent'>;
    /** The `ExecutionContextStart` API from `CoreStart`. */
    executionContext?: ExecutionContextStart;
    /** `CoreEnv` from core */
    coreEnv?: CoreEnv;
    /** Chrome service for wrapping children in Chrome context providers */
    chrome?: Pick<ChromeStart, 'withProvider'>;
}
/**
 * The `KibanaRootContextProvider` provides the necessary context at the root of Kibana, including
 * initialization and the theme and i18n contexts.  This context should only be used _once_, and
 * at the _very top_ of the application root, rendered by the `RenderingService`.
 *
 * While this context is exposed for edge cases and tooling, (e.g. Storybook, Jest, etc.), it should
 * _not_ be used in applications.  Instead, applications should choose the context that makes the
 * most sense for the problem they are trying to solve:
 *
 * - Consider `KibanaRenderContextProvider` for rendering components outside the current tree, (e.g.
 * with `ReactDOM.render`).
 * - Consider `KibanaThemeContextProvider` for altering the theme of a component or tree of components.
 *
 */
export declare const KibanaRootContextProvider: FC<PropsWithChildren<KibanaRootContextProviderProps>>;
