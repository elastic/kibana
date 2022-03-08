/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Lifecycle } from './lifecycle';

export interface ScreenshotRecord {
  name: string;
  base64Png: string;
  baselinePath?: string;
  failurePath?: string;
}

export class TestMetadata {
  // mocha's global types mean we can't import Mocha or it will override the global jest types..............
  private currentRunnable?: any;

  constructor(lifecycle: Lifecycle) {
    lifecycle.beforeEachRunnable.add((runnable) => {
      this.currentRunnable = runnable;
    });
  }

  addScreenshot(screenshot: ScreenshotRecord) {
    this.currentRunnable._screenshots = (this.currentRunnable._screenshots || []).concat(
      screenshot
    );
  }

  getScreenshots(test: any): ScreenshotRecord[] {
    if (!test || typeof test !== 'object' || !test._screenshots) {
      return [];
    }

    return test._screenshots.slice();
  }
}
