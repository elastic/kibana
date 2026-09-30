/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../ftr_provider_context';

/**
 * FTR → Scout migration note:
 *
 * The core embedded-console flow (control bar, open/close body, fullscreen
 * toggle) is ALREADY migrated to Scout as the `EmbeddedConsole` page object
 * owned by the console plugin
 * (`@kbn/console-plugin/test/scout/ui/fixtures/page_objects`). Consuming plugins
 * register it on their own `pageObjects` fixture via the "reusing a page object
 * from another plugin" pattern (see the `@kbn/scout` README). Usage example:
 * `x-pack/platform/plugins/shared/ingest_pipelines/test/scout/ui/tests/feature_controls.spec.ts`.
 * When migrating the suites that still consume this FTR page object, reuse that
 * page object instead of re-porting these methods.
 *
 * The Notebooks methods below (`*EmbeddedConsoleNotebook*`) are intentionally
 * NOT ported: their test subjects are owned by the search-solution
 * `search_notebooks` plugin, so their Scout equivalent belongs in
 * `@kbn/scout-search` (or the consuming suite), not the shared package.
 */
export function EmbeddedConsoleProvider(ctx: FtrProviderContext) {
  const testSubjects = ctx.getService('testSubjects');

  return {
    async expectEmbeddedConsoleControlBarExists() {
      await testSubjects.existOrFail('consoleEmbeddedSection');
    },
    async expectEmbeddedConsoleToBeOpen() {
      await testSubjects.existOrFail('consoleEmbeddedBody');
    },
    async expectEmbeddedConsoleToBeClosed() {
      await testSubjects.missingOrFail('consoleEmbeddedBody');
    },
    async clickEmbeddedConsoleControlBar() {
      await testSubjects.click('consoleEmbeddedControlBar');
    },
    async expectEmbeddedConsoleHaveFullscreenToggle() {
      await testSubjects.existOrFail('consoleToggleFullscreenButton');
    },
    async expectEmbeddedConsoleNotebooksButtonExists() {
      await testSubjects.existOrFail('consoleEmbeddedNotebooksButton');
    },
    async clickEmbeddedConsoleNotebooksButton() {
      await testSubjects.click('consoleEmbeddedNotebooksButton');
    },
    async expectEmbeddedConsoleNotebooksToBeOpen() {
      await testSubjects.existOrFail('consoleEmbeddedNotebooksContainer');
    },
    async expectEmbeddedConsoleNotebooksToBeClosed() {
      await testSubjects.missingOrFail('consoleEmbeddedNotebooksContainer');
    },
    async expectEmbeddedConsoleNotebookListItemToBeAvailable(id: string) {
      await testSubjects.existOrFail(`console-embedded-notebook-select-btn-${id}`);
    },
    async clickEmbeddedConsoleNotebook(id: string) {
      await testSubjects.click(`console-embedded-notebook-select-btn-${id}`);
    },
    async expectEmbeddedConsoleNotebookToBeAvailable(id: string) {
      await testSubjects.click(`console-embedded-notebook-select-btn-${id}`);
    },
  };
}
