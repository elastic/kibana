/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Reporter } from './reporter';
import { createApplicationUsageMetric, ApplicationUsageMetric } from './metrics';

type TrackedApplication = Record<string, ApplicationUsageMetric>;
interface ApplicationKey {
  appId: string;
  viewId: string;
}

export class ApplicationUsageTracker {
  private trackedApplicationViews: TrackedApplication = {};
  private reporter: Reporter;

  private currentAppId?: string;
  private currentApplicationKeys: ApplicationKey[] = [];

  private beforeUnloadListener?: EventListener;
  private onVisiblityChangeListener?: EventListener;
  private onClickListener?: EventListener;

  constructor(reporter: Reporter) {
    this.reporter = reporter;
  }

  private createKey(appId: string, viewId: string): ApplicationKey {
    return { appId, viewId };
  }

  private serializeKey({ appId, viewId }: ApplicationKey): string {
    return `${appId}-${viewId}`;
  }

  private trackApplications(appKeys: ApplicationKey[]) {
    for (const { appId, viewId } of appKeys.filter(Boolean)) {
      const serializedKey = this.serializeKey({ appId, viewId });
      if (typeof this.trackedApplicationViews[serializedKey] !== 'undefined') {
        continue;
      }
      const metric = createApplicationUsageMetric(appId, viewId);
      this.trackedApplicationViews[serializedKey] = metric;
    }
  }

  private attachListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.beforeUnloadListener = () => {
      this.flushTrackedViews();
    };

    this.onVisiblityChangeListener = () => {
      if (document.visibilityState === 'visible') {
        this.resumeTracking();
      } else if (document.visibilityState === 'hidden') {
        this.pauseTracking();
      }
    };

    this.onClickListener = () => {
      this.updateActiveViewsClickCounters();
    };

    // Before leaving the page, make sure we store the current usage
    window.addEventListener('beforeunload', this.beforeUnloadListener);

    // Monitoring dashboards might be open in background and we are fine with that
    // but we don't want to report hours if the user goes to another tab and Kibana is not shown
    document.addEventListener('visibilitychange', this.onVisiblityChangeListener);

    // Count any clicks and assign it to the current app
    window.addEventListener('click', this.onClickListener);
  }

  private detachListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (this.beforeUnloadListener) {
      window.removeEventListener('beforeunload', this.beforeUnloadListener);
    }
    if (this.onVisiblityChangeListener) {
      document.removeEventListener('visibilitychange', this.onVisiblityChangeListener);
    }
    if (this.onClickListener) {
      window.removeEventListener('click', this.onClickListener);
    }
  }

  private sendMetricsToReporter(metrics: ApplicationUsageMetric[]) {
    metrics.forEach((metric) => {
      this.reporter.reportApplicationUsage(metric);
    });
  }

  private updateActiveViewsClickCounters() {
    const keys = Object.keys(this.trackedApplicationViews);
    for (const key of keys) {
      this.trackedApplicationViews[key].numberOfClicks++;
    }
  }

  private flushTrackedViews() {
    const appViewMetrics = Object.values(this.trackedApplicationViews);
    this.sendMetricsToReporter(appViewMetrics);
    this.trackedApplicationViews = {};
  }

  public start() {
    this.attachListeners();
  }

  public stop() {
    this.flushTrackedViews();
    this.detachListeners();
  }

  public setCurrentAppId(appId: string) {
    // application change, flush current views first.
    this.flushTrackedViews();
    this.currentAppId = appId;
  }

  public trackApplicationViewUsage(viewId: string): void {
    if (!this.currentAppId) {
      return;
    }
    const appKey = this.createKey(this.currentAppId, viewId);
    this.trackApplications([appKey]);
  }

  public pauseTracking() {
    this.currentApplicationKeys = Object.values(
      this.trackedApplicationViews
    ).map(({ appId, viewId }) => this.createKey(appId, viewId));

    this.flushTrackedViews();
  }

  public resumeTracking() {
    this.trackApplications(this.currentApplicationKeys);
    this.currentApplicationKeys = [];

    // We also want to send the report now because intervals and timeouts be stalled when too long in the "hidden" state
    // Note: it might be better to create a separate listener in the reporter for this.
    this.reporter.sendReports();
  }

  public flushTrackedView(viewId: string) {
    if (!this.currentAppId) {
      return;
    }

    const appKey = this.createKey(this.currentAppId, viewId);
    const serializedKey = this.serializeKey(appKey);
    const appViewMetric = this.trackedApplicationViews[serializedKey];
    this.sendMetricsToReporter([appViewMetric]);

    delete this.trackedApplicationViews[serializedKey];
  }
}
