/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright/test';
import type { ScoutPage } from '..';

/**
 * The embedded (persistent) console rendered at the bottom of solution and
 * management pages (e.g. Ingest Pipelines, Index Management) by the `console`
 * plugin. Availability is gated by the `devTools:enablePersistentConsole` UI
 * setting and the `console.ui.embeddedEnabled` config (both default to true;
 * disabled on serverless observability and security projects).
 */
export class EmbeddedConsole {
  readonly section: Locator;
  readonly controlBar: Locator;
  readonly body: Locator;
  readonly fullscreenToggle: Locator;

  constructor(page: ScoutPage) {
    this.section = page.testSubj.locator('consoleEmbeddedSection');
    this.controlBar = page.testSubj.locator('consoleEmbeddedControlBar');
    this.body = page.testSubj.locator('consoleEmbeddedBody');
    this.fullscreenToggle = page.testSubj.locator('consoleToggleFullscreenButton');
  }

  /**
   * Clicks the control bar, toggling the console body open or closed.
   */
  async toggle() {
    await this.controlBar.click();
  }
}
