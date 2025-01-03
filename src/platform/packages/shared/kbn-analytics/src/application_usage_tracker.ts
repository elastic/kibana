/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

  constructor(reporter: Reporter) {
    this.reporter = reporter;
  }

  private createKey(appId: string, viewId: string): ApplicationKey {
    return { appId, viewId };
  }

  static serializeKey({ appId, viewId }: ApplicationKey): string {
    return `${appId}-${viewId}`;
  }

  private trackApplications(appKeys: ApplicationKey[]) {
    for (const { appId, viewId } of appKeys.filter(Boolean)) {
      const serializedKey = ApplicationUsageTracker.serializeKey({ appId, viewId });
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
        this.resumeTrackingAll();
      } else if (document.visibilityState === 'hidden') {
        this.pauseTrackingAll();
      }
    };

    // Before leaving the page, make sure we store the current usage
    window.addEventListener('beforeunload', this.beforeUnloadListener);

    // Monitoring dashboards might be open in background and we are fine with that
    // but we don't want to report hours if the user goes to another tab and Kibana is not shown
    document.addEventListener('visibilitychange', this.onVisiblityChangeListener);
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
  }

  private sendMetricsToReporter(metrics: ApplicationUsageMetric[]) {
    metrics.forEach((metric) => {
      this.reporter.reportApplicationUsage(metric);
    });
  }

  public updateViewClickCounter(viewId: string) {
    if (!this.currentAppId) {
      return;
    }
    const appKey = ApplicationUsageTracker.serializeKey({ appId: this.currentAppId, viewId });
    if (this.trackedApplicationViews[appKey]) {
      this.trackedApplicationViews[appKey].numberOfClicks++;
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

  public pauseTrackingAll() {
    this.currentApplicationKeys = Object.values(this.trackedApplicationViews).map(
      ({ appId, viewId }) => this.createKey(appId, viewId)
    );

    this.flushTrackedViews();
  }

  public resumeTrackingAll() {
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
    const serializedKey = ApplicationUsageTracker.serializeKey(appKey);
    const appViewMetric = this.trackedApplicationViews[serializedKey];
    if (appViewMetric) {
      this.sendMetricsToReporter([appViewMetric]);
      delete this.trackedApplicationViews[serializedKey];
    }
  }
}
