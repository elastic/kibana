/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * The embedded (persistent) console rendered at the bottom of solution and
 * management pages (e.g. Ingest Pipelines, Index Management) by the `console`
 * plugin. Availability is gated by all of the following (see the console
 * plugin's `start`):
 * - the `console.ui.enabled` config (defaults to true),
 * - the `console.ui.embeddedEnabled` config (defaults to true; disabled on
 *   serverless observability and security projects),
 * - the `devTools:enablePersistentConsole` UI setting (defaults to true), and
 * - the current role having the `dev_tools` feature capability
 *   (`capabilities.dev_tools.show === true`).
 * A role without Dev Tools access will not get the console even with the two
 * configs and the UI setting enabled.
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
