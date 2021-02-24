/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reporter, ApplicationUsageTracker } from '@kbn/analytics';
import type { Subscription } from 'rxjs';
import React from 'react';
import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  HttpSetup,
} from 'src/core/public';
import { Storage } from '../../kibana_utils/public';
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

export interface UsageCollectionSetup {
  components: {
    ApplicationUsageTrackingProvider: React.FC;
  };
  reportUiCounter: Reporter['reportUiCounter'];
}

export interface UsageCollectionStart {
  reportUiCounter: Reporter['reportUiCounter'];
}

export function isUnauthenticated(http: HttpSetup) {
  const { anonymousPaths } = http;
  return anonymousPaths.isAnonymous(window.location.pathname);
}

export class UsageCollectionPlugin implements Plugin<UsageCollectionSetup, UsageCollectionStart> {
  private applicationUsageTracker?: ApplicationUsageTracker;
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
      reportUiCounter: this.reporter.reportUiCounter,
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
