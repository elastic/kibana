/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Reporter, METRIC_TYPE, ApplicationUsageTracker } from '@kbn/analytics';
import { Subject, merge, Subscription } from 'rxjs';
import React from 'react';
import { Storage } from '../../kibana_utils/public';
import { createReporter, trackApplicationUsageChange } from './services';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  HttpSetup,
} from '../../../core/public';
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

export interface UsageCollectionSetup {
  components: {
    ApplicationUsageTrackingProvider: React.FC;
  };
  allowTrackUserAgent: (allow: boolean) => void;
  applicationUsageTracker: IApplicationUsageTracker;
  reportUiCounter: Reporter['reportUiCounter'];
  METRIC_TYPE: typeof METRIC_TYPE;
  __LEGACY: {
    /**
     * Legacy handler so we can report the actual app being used inside "kibana#/{appId}".
     * To be removed when we get rid of the legacy world
     *
     * @deprecated
     */
    appChanged: (appId: string) => void;
  };
}

export interface UsageCollectionStart {
  reportUiCounter: Reporter['reportUiCounter'];
  METRIC_TYPE: typeof METRIC_TYPE;
  applicationUsageTracker: Pick<
    ApplicationUsageTracker,
    'trackApplicationViewUsage' | 'flushTrackedView' | 'updateViewClickCounter'
  >;
}

export function isUnauthenticated(http: HttpSetup) {
  const { anonymousPaths } = http;
  return anonymousPaths.isAnonymous(window.location.pathname);
}

export class UsageCollectionPlugin implements Plugin<UsageCollectionSetup, UsageCollectionStart> {
  private readonly legacyAppId$ = new Subject<string>();
  private applicationUsageTracker?: ApplicationUsageTracker;
  private trackUserAgent: boolean = true;
  private subscriptions: Subscription[] = [];
  private reporter?: Reporter;
  private config: PublicConfigType;
  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<PublicConfigType>();
  }

  public setup({ http }: CoreSetup): UsageCollectionSetup {
    const localStorage = new Storage(window.localStorage);
    const debug = this.config.uiCounters.debug;

    this.reporter = createReporter({
      localStorage,
      debug,
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
      applicationUsageTracker,
      allowTrackUserAgent: (allow: boolean) => {
        this.trackUserAgent = allow;
      },
      reportUiCounter: this.reporter.reportUiCounter,
      METRIC_TYPE,
      __LEGACY: {
        appChanged: (appId) => this.legacyAppId$.next(appId),
      },
    };
  }

  public start({ http, application }: CoreStart) {
    if (!this.reporter || !this.applicationUsageTracker) {
      throw new Error('Usage collection reporter not set up correctly');
    }

    if (this.config.uiCounters.enabled && !isUnauthenticated(http)) {
      this.reporter.start();
      this.applicationUsageTracker.start();
      this.subscriptions = trackApplicationUsageChange(
        merge(application.currentAppId$, this.legacyAppId$),
        this.applicationUsageTracker
      );
    }

    if (this.trackUserAgent) {
      this.reporter.reportUserAgent('kibana');
    }

    return {
      applicationUsageTracker: this.getPublicApplicationUsageTracker(),
      reportUiCounter: this.reporter.reportUiCounter,
      METRIC_TYPE,
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
