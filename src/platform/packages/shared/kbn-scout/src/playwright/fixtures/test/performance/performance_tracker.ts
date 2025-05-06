/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CDPSession, TestInfo } from '@playwright/test';
import { BundleInfo, PageInfo, PerformanceMetrics, PluginInfo } from './types';

export class PerformanceTracker {
  private bundleResponses = new Map<string, BundleInfo>();

  constructor(private testInfo: TestInfo) {}

  private getRequestData(requestId: string): BundleInfo {
    if (!this.bundleResponses.has(requestId)) {
      this.bundleResponses.set(requestId, {
        url: '',
        name: '',
        plugin: '',
        transferredSize: 0,
        headersSize: 0,
      });
    }
    return this.bundleResponses.get(requestId)!;
  }

  captureBundleResponses(cdp: CDPSession) {
    cdp.on('Network.responseReceived', (event) => {
      if (event.response.url.endsWith('.js') && event.response.url.includes('bundles')) {
        const requestData = this.getRequestData(event.requestId);
        requestData.url = event.response.url;
        requestData.name = event.response.url.split('/').pop()!;
        requestData.plugin = requestData.name.split('.')[0];
        requestData.headersSize = event.response.headersText?.length ?? 0;
      }
    });

    cdp.on('Network.loadingFinished', (event) => {
      if (this.bundleResponses.has(event.requestId)) {
        this.bundleResponses.get(event.requestId)!.transferredSize = event.encodedDataLength;
      }
    });
  }

  async waitForJsLoad(cdp: CDPSession, timeout: number = 2000): Promise<void> {
    return new Promise<void>((resolve) => {
      let lastRequestTime = Date.now();
      let activeRequests = 0;

      // Track new JS requests
      cdp.on('Network.requestWillBeSent', (event) => {
        if (event.request.url.endsWith('.js') && event.request.url.includes('bundles')) {
          activeRequests++;
          lastRequestTime = Date.now();
        }
      });

      // Track when JS requests are completed
      cdp.on('Network.loadingFinished', () => {
        activeRequests = Math.max(0, activeRequests - 1);
      });

      // Check every 500ms if no new requests arrived
      const interval = setInterval(() => {
        if (Date.now() - lastRequestTime > timeout && activeRequests === 0) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
  }

  computeBundleStats(bundleResponses: Map<string, BundleInfo>): PageInfo {
    const bundles = Array.from(bundleResponses.values());
    const pluginAggregates = new Map<string, PluginInfo>();

    let totalSize = 0;

    for (const { plugin, transferredSize, name } of bundles) {
      totalSize += transferredSize;

      if (!pluginAggregates.has(plugin)) {
        pluginAggregates.set(plugin, { count: 0, totalSize: 0, bundles: [] });
      }

      const pluginInfo = pluginAggregates.get(plugin)!;
      pluginInfo.count += 1;
      pluginInfo.totalSize += transferredSize;
      pluginInfo.bundles.push({ name, transferredSize });
    }

    // Sort plugins alphabetically and bundle names inside them
    const plugins = Array.from(pluginAggregates.entries())
      .map(([pluginName, pluginInfo]) => ({
        name: pluginName,
        bundlesCount: pluginInfo.count,
        totalSize: pluginInfo.totalSize,
        bundles: pluginInfo.bundles.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      bundleCount: bundles.length,
      totalSize,
      pluginCount: pluginAggregates.size,
      plugins,
    };
  }

  collectJsBundleStats(url: string) {
    const stats = this.computeBundleStats(this.bundleResponses);

    this.testInfo.attach('page-bundles-report', {
      body: JSON.stringify({ url, ...stats }, null, 2),
      contentType: 'application/json',
    });

    return stats;
  }

  // CDP Performance Domain Metrics

  async capturePagePerformanceMetrics(cdp: CDPSession) {
    await cdp.send('Performance.enable');
    const { metrics } = await cdp.send('Performance.getMetrics');

    return {
      jsHeapUsedSize: metrics.find((m) => m.name === 'JSHeapUsedSize')?.value,
      jsHeapTotalSize: metrics.find((m) => m.name === 'JSHeapTotalSize')?.value,
      cpuTime: metrics.find((m) => m.name === 'TaskDuration')?.value,
      scriptTime: metrics.find((m) => m.name === 'ScriptDuration')?.value,
      layoutTime: metrics.find((m) => m.name === 'LayoutDuration')?.value,
      fps: metrics.find((m) => m.name === 'FramesPerSecond')?.value,
      nodesCount: metrics.find((m) => m.name === 'Nodes')?.value,
      documentsCount: metrics.find((m) => m.name === 'Documents')?.value,
      layoutCount: metrics.find((m) => m.name === 'LayoutCount')?.value,
      styleRecalcCount: metrics.find((m) => m.name === 'RecalcStyleCount')?.value,
    };
  }

  private comparePerformanceMetrics(before: PerformanceMetrics, after: PerformanceMetrics) {
    const metrics: Record<
      string,
      { before: number; after: number; diff: number; percentage: string }
    > = {};

    for (const key of Object.keys(after)) {
      const metricKey = key as keyof PerformanceMetrics;
      if (after[metricKey] !== undefined && before[metricKey] !== undefined) {
        const diff = after[metricKey]! - before[metricKey]!;
        const percentage =
          before[metricKey] !== 0 ? ((diff / before[metricKey]!) * 100).toFixed(2) + '%' : 'N/A';

        metrics[metricKey] = {
          before: before[metricKey]!,
          after: after[metricKey]!,
          diff,
          percentage,
        };
      }
    }

    return metrics;
  }

  collectPagePerformanceStats = (
    url: string,
    before: PerformanceMetrics,
    after: PerformanceMetrics
  ) => {
    const stats = this.comparePerformanceMetrics(before, after);

    this.testInfo.attach('perf-metrics-report', {
      body: JSON.stringify({ url, stats }, null, 2),
      contentType: 'application/json',
    });

    return stats;
  };
}
