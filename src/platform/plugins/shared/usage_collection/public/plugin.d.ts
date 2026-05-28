import { ApplicationUsageTracker } from '@kbn/analytics';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { FC, PropsWithChildren } from 'react';
import type { PluginInitializerContext, Plugin, CoreSetup, CoreStart, HttpSetup } from '@kbn/core/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
export interface PublicConfigType {
    uiCounters: {
        enabled: boolean;
        debug: boolean;
    };
}
export type IApplicationUsageTracker = Pick<ApplicationUsageTracker, 'trackApplicationViewUsage' | 'flushTrackedView' | 'updateViewClickCounter'>;
interface UsageCollectionStartDependencies {
    screenshotMode: ScreenshotModePluginStart;
}
/** Public's setup APIs exposed by the UsageCollection Service **/
export interface UsageCollectionSetup {
    /** Component helpers to track usage collection in the UI **/
    components: {
        /**
         * The context provider to wrap the application if planning to use
         * {@link TrackApplicationView} somewhere inside the app.
         *
         * @example
         * ```typescript jsx
         * class MyPlugin implements Plugin {
         *   ...
         *   public setup(core: CoreSetup, plugins: { usageCollection?: UsageCollectionSetup }) {
         *     const ApplicationUsageTrackingProvider = plugins.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
         *
         *     core.application.register({
         *       id,
         *       title,
         *       ...,
         *       mount: async (params: AppMountParameters) => {
         *         ReactDOM.render(
         *           <ApplicationUsageTrackingProvider> // Set the tracking context provider at the App level
         *             <I18nProvider>
         *               <App />
         *             </I18nProvider>
         *           </ApplicationUsageTrackingProvider>,
         *           element
         *         );
         *         return () => ReactDOM.unmountComponentAtNode(element);
         *       },
         *     });
         *   }
         *   ...
         * }
         * ```
         */
        ApplicationUsageTrackingProvider: FC<PropsWithChildren<unknown>>;
    };
    /** Report whenever a UI event occurs for UI counters to report it **/
    reportUiCounter: (appName: string, type: UiCounterMetricType, eventNames: string | string[], count?: number) => void;
}
/** Public's start APIs exposed by the UsageCollection Service **/
export interface UsageCollectionStart {
    /** Report whenever a UI event occurs for UI counters to report it **/
    reportUiCounter: (appName: string, type: UiCounterMetricType, eventNames: string | string[], count?: number) => void;
}
export declare function isUnauthenticated(http: HttpSetup): boolean;
export declare class UsageCollectionPlugin implements Plugin<UsageCollectionSetup, UsageCollectionStart, {}, UsageCollectionStartDependencies> {
    private readonly initContext;
    private applicationUsageTracker?;
    private subscriptions;
    private reporter?;
    private config;
    constructor(initContext: PluginInitializerContext);
    setup({ http }: CoreSetup): UsageCollectionSetup;
    start({ http, application }: CoreStart, { screenshotMode }: UsageCollectionStartDependencies): {
        reportUiCounter: (appName: string, type: string, eventNames: string | string[], count?: number) => void;
    };
    stop(): void;
    private getPublicApplicationUsageTracker;
}
export {};
