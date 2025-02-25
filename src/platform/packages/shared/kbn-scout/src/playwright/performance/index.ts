/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';
import path from 'path';
import { SCOUT_OUTPUT_ROOT } from '@kbn/scout-info';
import { CDPSession } from '@playwright/test';
import { ScoutLogger } from '../../common';

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

export function trackBundleSizes(client: CDPSession) {
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

  client.on('Network.responseReceived', (event) => {
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

  client.on('Network.loadingFinished', (event) => {
    if (bundleResponses.has(event.requestId)) {
      bundleResponses.get(event.requestId)!.transferredSize = event.encodedDataLength;
    }
  });

  return { bundleResponses, client };
}

export async function waitForJsBundles(
  cdpClient: CDPSession,
  timeout: number = 2000
): Promise<void> {
  return new Promise<void>((resolve) => {
    let lastRequestTime = Date.now();
    let activeRequests = 0;

    // Track new JS requests
    cdpClient.on('Network.requestWillBeSent', (event) => {
      if (event.request.url.endsWith('.js') && event.request.url.includes('bundles')) {
        activeRequests++;
        lastRequestTime = Date.now();
      }
    });

    // Track when JS requests are completed
    cdpClient.on('Network.loadingFinished', () => {
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

function parseBundleResponses(bundleResponses: Map<string, BundleInfo>): PageInfo {
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

export function savePageBundleStats(
  bundleResponses: Map<string, BundleInfo>,
  fileName: string,
  appPath: string,
  log: ScoutLogger
) {
  const pageStats = parseBundleResponses(bundleResponses);
  const performanceDirPath = path.join(SCOUT_OUTPUT_ROOT, 'performance');
  const reportFilePath = path.join(
    performanceDirPath,
    `${fileName}-bundle-stats-${Date.now()}.json`
  );

  try {
    const jsonData = JSON.stringify({ ...pageStats, appPath }, null, 2);

    if (!Fs.existsSync(performanceDirPath)) {
      log.debug(`scout: creating performance directory: ${performanceDirPath}`);
      Fs.mkdirSync(performanceDirPath, { recursive: true });
    }

    Fs.writeFileSync(reportFilePath, jsonData, 'utf-8');
    log.info(`scout: Bundles report saved at ${reportFilePath}`);
  } catch (error) {
    log.error(`scout: Failed to save test server configuration - ${error.message}`);
    throw new Error(`Failed to save Bundles report at ${reportFilePath}`);
  }
}
