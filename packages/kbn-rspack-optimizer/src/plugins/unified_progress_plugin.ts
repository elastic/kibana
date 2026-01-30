/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Compiler, RspackPluginInstance } from '@rspack/core';

interface ProgressState {
  percentage: number;
  message: string;
}

/**
 * Shared state for tracking progress across multiple compilers
 */
class UnifiedProgressTracker {
  private static instance: UnifiedProgressTracker;
  private progressMap = new Map<string, ProgressState>();
  private totalCompilers = 0;
  private lastPercentLogged = -1;
  private startTime = Date.now();
  private lastRenderTime = 0;
  private renderTimeout: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 3000; // Update every 3 seconds
  private readonly PERCENT_THRESHOLD = 5; // Or when progress changes by 5%

  static getInstance(): UnifiedProgressTracker {
    if (!UnifiedProgressTracker.instance) {
      UnifiedProgressTracker.instance = new UnifiedProgressTracker();
    }
    return UnifiedProgressTracker.instance;
  }

  reset(totalCompilers: number): void {
    this.progressMap.clear();
    this.totalCompilers = totalCompilers;
    this.lastPercentLogged = -1;
    this.startTime = Date.now();
    this.lastRenderTime = 0;
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
  }

  updateProgress(compilerId: string, percentage: number, message: string): void {
    this.progressMap.set(compilerId, { percentage, message });
    this.scheduleRender();
  }

  private scheduleRender(): void {
    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;

    // If enough time has passed, render immediately
    if (timeSinceLastRender >= this.REFRESH_INTERVAL_MS) {
      this.render();
      return;
    }

    // Otherwise, schedule a render if not already scheduled
    if (!this.renderTimeout) {
      this.renderTimeout = setTimeout(() => {
        this.renderTimeout = null;
        this.render();
      }, this.REFRESH_INTERVAL_MS - timeSinceLastRender);
    }
  }

  private render(): void {
    // Calculate overall progress
    let totalPercentage = 0;
    let completedCount = 0;
    const activePlugins: string[] = [];

    for (const [id, state] of this.progressMap) {
      totalPercentage += state.percentage;
      if (state.percentage >= 1) {
        completedCount++;
      } else if (state.percentage > 0) {
        activePlugins.push(id);
      }
    }

    // Average percentage across all compilers
    const overallPercentage = this.totalCompilers > 0
      ? totalPercentage / this.totalCompilers
      : 0;

    const percent = Math.floor(overallPercentage * 100);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

    // Create progress bar
    const barWidth = 30;
    const filled = Math.floor(barWidth * overallPercentage);
    const empty = barWidth - filled;
    const bar = '━'.repeat(filled) + '╺' + '─'.repeat(Math.max(0, empty - 1));

    // Status text - show completion count and active count
    let status: string;
    if (activePlugins.length > 0) {
      status = `${completedCount}/${this.totalCompilers} done, ${activePlugins.length} building`;
    } else if (completedCount < this.totalCompilers) {
      status = `${completedCount}/${this.totalCompilers} done, waiting...`;
    } else {
      status = `${completedCount}/${this.totalCompilers} done`;
    }

    // Only log if progress changed significantly (by PERCENT_THRESHOLD or more)
    const shouldLog = 
      this.lastPercentLogged < 0 || // First update
      percent >= 100 || // Completion
      (percent - this.lastPercentLogged) >= this.PERCENT_THRESHOLD;

    if (shouldLog) {
      this.lastPercentLogged = percent;
      this.lastRenderTime = Date.now();

      // Simple line-based output that won't interfere with other logs
      // eslint-disable-next-line no-console
      console.log(`● rspack ${bar} (${percent}%) ${status} [${elapsed}s]`);
    }
  }

  finish(): void {
    // Clear any pending render
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const bundleCount = this.totalCompilers;
    // eslint-disable-next-line no-console
    console.log(`✓ rspack ${bundleCount} bundles built in ${elapsed}s`);
  }
}

export interface UnifiedProgressPluginOptions {
  /** Unique identifier for this compiler */
  compilerId: string;
  /** Total number of compilers (set on first plugin) */
  totalCompilers?: number;
}

/**
 * RSPack plugin that contributes to a unified progress bar across all compilers
 */
export class UnifiedProgressPlugin implements RspackPluginInstance {
  private readonly compilerId: string;
  private readonly totalCompilers?: number;

  constructor(options: UnifiedProgressPluginOptions) {
    this.compilerId = options.compilerId;
    this.totalCompilers = options.totalCompilers;
  }

  apply(compiler: Compiler): void {
    const tracker = UnifiedProgressTracker.getInstance();

    // If this is the first compiler (has totalCompilers), reset the tracker
    if (this.totalCompilers !== undefined) {
      tracker.reset(this.totalCompilers);
    }

    // Hook into compilation progress
    new compiler.webpack.ProgressPlugin((percentage, message) => {
      tracker.updateProgress(this.compilerId, percentage, message || '');

      // When this compiler finishes
      if (percentage >= 1) {
        // Check if all compilers are done
        // This is handled by the multi-compiler's done hook
      }
    }).apply(compiler);

    // Hook into done to potentially finish the progress bar
    compiler.hooks.done.tap('UnifiedProgressPlugin', () => {
      tracker.updateProgress(this.compilerId, 1, 'done');
    });
  }
}

/**
 * Create unified progress plugins for a set of configs
 * Returns an array of plugins, one for each config
 */
export function createUnifiedProgressPlugins(compilerIds: string[]): UnifiedProgressPlugin[] {
  return compilerIds.map((id, index) =>
    new UnifiedProgressPlugin({
      compilerId: id,
      totalCompilers: index === 0 ? compilerIds.length : undefined,
    })
  );
}

/**
 * Call this when all compilations are complete
 */
export function finishUnifiedProgress(): void {
  UnifiedProgressTracker.getInstance().finish();
}
