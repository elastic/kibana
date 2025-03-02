/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CDPSession } from '@playwright/test';
import { coreWorkerFixtures } from '../../worker';

interface PerformanceMetrics {
  jsHeapUsedSize?: number;
  jsHeapTotalSize?: number;
  cpuTime?: number;
  scriptTime?: number;
  layoutTime?: number;
  fps?: number;
  nodesCount?: number;
  documentsCount?: number;
  layoutCount?: number;
  styleRecalcCount?: number;
}

export interface BundleInfo {
  url: string;
  name: string;
  plugin: string;
  transferredSize: number;
  headersSize: number;
}

interface PluginInfo {
  count: number;
  totalSize: number;
}

interface PageInfo {
  bundleCount: number;
  totalSize: number;
  pluginCount: number;
  plugins: Array<{
    name: string;
    bundlesCount: number;
    totalSize: number;
    bundles: Array<{ name: string; transferredSize: number }>;
  }>;
}

export interface PerfTrackerFixture {
  trackBundleResponses: (cdp: CDPSession) => Map<string, BundleInfo>;
  waitForJsResourcesToLoad: (cdp: CDPSession, timeout?: number) => Promise<void>;
  collectBundleStats: (url: string, bundleResponses: Map<string, BundleInfo>) => PageInfo;
  getPerformanceDomainMetrics(cdp: CDPSession): Promise<PerformanceMetrics>;
  collectPerformanceStats(url: string, before: PerformanceMetrics, after: PerformanceMetrics): void;
}

export const perfTrackerFixture = coreWorkerFixtures.extend<{ perfTracker: PerfTrackerFixture }>({
  perfTracker: [
    async ({ log }, use, testInfo) => {
      log.serviceLoaded('perfTracker');

      const collectBundleStats = (url: string, bundleResponses: Map<string, BundleInfo>) => {
        const stats = prepareStats(bundleResponses);

        testInfo.attach('page-bundles-report', {
          body: JSON.stringify({ url, ...stats }, null, 2),
          contentType: 'application/json',
        });

        return stats;
      };

      const collectPerformanceStats = (
        url: string,
        before: PerformanceMetrics,
        after: PerformanceMetrics
      ) => {
        const stats = getPerformanceDiff(before, after);

        testInfo.attach('perf-metrics-report', {
          body: JSON.stringify({ url, stats }, null, 2),
          contentType: 'application/json',
        });

        return stats;
      };

      await use({
        trackBundleResponses,
        waitForJsResourcesToLoad,
        collectBundleStats,
        getPerformanceDomainMetrics,
        collectPerformanceStats,
      });
    },
    { scope: 'test' },
  ],
});

function trackBundleResponses(cdp: CDPSession) {
  const bundleResponses = new Map<string, BundleInfo>();

  function getRequestData(requestId: string): BundleInfo {
    if (!bundleResponses.has(requestId)) {
      bundleResponses.set(requestId, {
        url: '',
        name: '',
        plugin: '',
        transferredSize: 0,
        headersSize: 0,
      });
    }
    return bundleResponses.get(requestId)!;
  }

  cdp.on('Network.responseReceived', (event) => {
    if (event.response.url.endsWith('.js') && event.response.url.includes('bundles')) {
      const url = event.response.url;
      const name = url.substring(url.lastIndexOf('/') + 1);
      const plugin = name.split('.')[0];

      const requestData = getRequestData(event.requestId);
      requestData.url = url;
      requestData.name = name;
      requestData.plugin = plugin;
      requestData.headersSize = event.response.headersText?.length ?? 0;
    }
  });

  cdp.on('Network.loadingFinished', (event) => {
    if (bundleResponses.has(event.requestId)) {
      bundleResponses.get(event.requestId)!.transferredSize = event.encodedDataLength;
    }
  });

  return bundleResponses;
}

async function waitForJsResourcesToLoad(cdp: CDPSession, timeout: number = 2000): Promise<void> {
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

function prepareStats(bundleResponses: Map<string, BundleInfo>): PageInfo {
  const chunks = Array.from(bundleResponses.values());
  const pluginStats = chunks.reduce((acc: Map<string, PluginInfo>, { plugin, transferredSize }) => {
    if (!acc.has(plugin)) {
      acc.set(plugin, { count: 0, totalSize: 0 });
    }
    const value = acc.get(plugin)!;
    acc.set(plugin, { count: value.count + 1, totalSize: value.totalSize + transferredSize });
    return acc;
  }, new Map<string, PluginInfo>());

  return {
    bundleCount: chunks.length,
    totalSize: chunks.reduce((acc, { transferredSize }) => acc + transferredSize, 0),
    pluginCount: pluginStats.size,
    plugins: Array.from(pluginStats.entries())
      .map(([pluginName, { count, totalSize }]) => ({
        name: pluginName,
        bundlesCount: count,
        totalSize,
        bundles: Array.from(bundleResponses.entries())
          .filter(([, { plugin }]) => plugin === pluginName)
          .map(([, bundleInfo]) => ({
            name: bundleInfo.name,
            transferredSize: bundleInfo.transferredSize,
          }))
          .sort((bundleA, bundleB) => bundleA.name.localeCompare(bundleB.name)),
      }))
      .sort((pluginA, pluginB) => pluginA.name.localeCompare(pluginB.name)),
  };
}

async function getPerformanceDomainMetrics(cdp: CDPSession) {
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

function getPerformanceDiff(before: PerformanceMetrics, after: PerformanceMetrics) {
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
