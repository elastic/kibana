/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reporter, ApplicationUsageTracker } from '@kbn/analytics';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { Subscription } from 'rxjs';
import React, { FC, PropsWithChildren } from 'react';
import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  HttpSetup,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { isSyntheticsMonitor } from '@kbn/analytics-collection-utils';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import { createReporter, trackApplicationUsageChange } from './services';
import { ApplicationUsageContext } from './components/track_application_view';

export interface PublicConfigType {
  uiCounters: {
    enabled: boolean;
    debug: boolean;
  };
}
export type IApplicationUsageTracker = Pick<
  ApplicationUsageTracker,
  'trackApplicationViewUsage' | 'flushTrackedView' | 'updateViewClickCounter'
>;

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
  reportUiCounter: (
    appName: string,
    type: UiCounterMetricType,
    eventNames: string | string[],
    count?: number
  ) => void;
}

/** Public's start APIs exposed by the UsageCollection Service **/
export interface UsageCollectionStart {
  /** Report whenever a UI event occurs for UI counters to report it **/
  reportUiCounter: (
    appName: string,
    type: UiCounterMetricType,
    eventNames: string | string[],
    count?: number
  ) => void;
}

export function isUnauthenticated(http: HttpSetup) {
  const { anonymousPaths } = http;
  return anonymousPaths.isAnonymous(window.location.pathname);
}

export class UsageCollectionPlugin
  implements
    Plugin<UsageCollectionSetup, UsageCollectionStart, {}, UsageCollectionStartDependencies>
{
  private applicationUsageTracker?: ApplicationUsageTracker;
  private subscriptions: Subscription[] = [];
  private reporter?: Reporter;
  private config: PublicConfigType;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.config = initContext.config.get<PublicConfigType>();
  }

  public setup({ http }: CoreSetup): UsageCollectionSetup {
    const localStorage = new Storage(window.localStorage);

    this.reporter = createReporter({
      localStorage,
      logger: this.initContext.logger.get('reporter'),
      fetch: http,
    });

    this.applicationUsageTracker = new ApplicationUsageTracker(this.reporter);

    const applicationUsageTracker = this.getPublicApplicationUsageTracker();

    return {
      components: {
        ApplicationUsageTrackingProvider: (props) => (
          <ApplicationUsageContext.Provider value={applicationUsageTracker}>
            {props.children}
          </ApplicationUsageContext.Provider>
        ),
      },
      reportUiCounter: this.reporter.reportUiCounter,
    };
  }

  public start(
    { http, application }: CoreStart,
    { screenshotMode }: UsageCollectionStartDependencies
  ) {
    if (!this.reporter || !this.applicationUsageTracker) {
      throw new Error('Usage collection reporter not set up correctly');
    }

    if (
      this.config.uiCounters.enabled &&
      !isUnauthenticated(http) &&
      !screenshotMode.isScreenshotMode() &&
      !isSyntheticsMonitor()
    ) {
      this.reporter.start();
      this.applicationUsageTracker.start();
      this.subscriptions = trackApplicationUsageChange(
        application.currentAppId$,
        this.applicationUsageTracker
      );
    }

    this.reporter.reportUserAgent('kibana');

    return {
      reportUiCounter: this.reporter.reportUiCounter,
    };
  }

  public stop() {
    if (this.applicationUsageTracker) {
      this.applicationUsageTracker.stop();
      this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    }
  }

  private getPublicApplicationUsageTracker(): IApplicationUsageTracker {
    // Using this.applicationUsageTracker! because this private method is only called once it's initialised
    return {
      trackApplicationViewUsage: this.applicationUsageTracker!.trackApplicationViewUsage.bind(
        this.applicationUsageTracker
      ),
      flushTrackedView: this.applicationUsageTracker!.flushTrackedView.bind(
        this.applicationUsageTracker
      ),
      updateViewClickCounter: this.applicationUsageTracker!.updateViewClickCounter.bind(
        this.applicationUsageTracker
      ),
    };
  }
}
