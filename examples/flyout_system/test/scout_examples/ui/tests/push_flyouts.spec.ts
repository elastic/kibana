/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * Regression tests for push flyout bugs fixed in EUI, run against the "Push flyouts" section of
 * the example app. Tests are grouped by bug and prefixed with its issue.
 */

const NONE = '(none)';

test.describe('Flyout System - push flyouts', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.flyoutSystem.goto();
  });

  /**
   * https://github.com/elastic/eui/issues/9788, fixed by https://github.com/elastic/eui/pull/10063
   *
   * Push flyouts sharing a padding target each saved and restored the padding on their own, so
   * depending on the close order the page stayed pushed with nothing open, or lost its padding
   * while a push flyout was still open.
   */
  test('elastic/eui#9788: closing the older of two standalone push flyouts first leaves no padding behind', async ({
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;

    await test.step('open Standalone A, then Standalone B', async () => {
      await app.openPushFlyout('Standalone A');
      await app.openPushFlyout('Standalone B');
      await expect(app.pushPagePadding()).not.toHaveText(NONE);
    });

    await test.step('closing Standalone A keeps the page pushed for B', async () => {
      await app.closePushFlyout('Standalone A');
      await expect(app.pushFlyout('Standalone B')).toBeVisible();
      await expect(app.pushPagePadding()).not.toHaveText(NONE);
    });

    await test.step('closing Standalone B removes the padding', async () => {
      await app.closePushFlyout('Standalone B');
      await expect(app.pushPagePadding()).toHaveText(NONE);
    });
  });

  test('elastic/eui#9788: closing a standalone push flyout keeps the page pushed for an open system push flyout', async ({
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;

    await test.step('open Standalone A, then System push C', async () => {
      await app.openPushFlyout('Standalone A');
      await app.openPushFlyout('System push C');
    });

    await test.step('closing Standalone A keeps the page pushed for C', async () => {
      await app.closePushFlyout('Standalone A');
      await expect(app.pushFlyout('System push C')).toBeVisible();
      await expect(app.pushPagePadding()).not.toHaveText(NONE);
    });

    await test.step('closing System push C removes the padding', async () => {
      await app.closePushFlyout('System push C');
      await expect(app.pushPagePadding()).toHaveText(NONE);
    });
  });

  // Also covers the removed core workaround (`resetPushOffsetIfIdle`), which cleared the padding
  // when the last system flyout closed even though a standalone push flyout was still open.
  test('elastic/eui#9788: closing a system overlay keeps the padding of a standalone push flyout under it', async ({
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;

    await app.openPushFlyout('Standalone A');
    await expect(app.pushPagePadding()).not.toHaveText(NONE);
    const pushedPadding = await app.pushPagePadding().innerText();

    await test.step('opening System overlay E keeps the padding', async () => {
      await app.openPushFlyout('System overlay E');
      await expect(app.pushPagePadding()).toHaveText(pushedPadding);
    });

    await test.step('closing System overlay E keeps the padding', async () => {
      // The overlay mask covers the page toggles.
      await app.closePushFlyoutFromInside('System overlay E');
      await expect(app.pushFlyout('Standalone A')).toBeVisible();
      await expect(app.pushPagePadding()).toHaveText(pushedPadding);
    });

    await test.step('closing Standalone A removes the padding', async () => {
      await app.closePushFlyout('Standalone A');
      await expect(app.pushPagePadding()).toHaveText(NONE);
    });
  });

  test('elastic/eui#9788: the padding follows the widest push flyout, including one resized in the background', async ({
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;

    // A and C open at the same size.
    await app.openPushFlyout('Standalone A');
    await app.openPushFlyout('System push C');
    await expect(app.pushPagePadding()).not.toHaveText(NONE);
    const pushedPadding = await app.pushPagePadding().innerText();

    await test.step('widening Standalone A behind C grows the padding', async () => {
      await app.widenPushFlyoutByKeyboard('Standalone A', 5);
      await expect
        .poll(async () => parseInt(await app.pushPagePadding().innerText(), 10))
        .toBeGreaterThan(parseInt(pushedPadding, 10));
    });

    await test.step('closing Standalone A brings the padding back to C', async () => {
      await app.closePushFlyout('Standalone A');
      await expect(app.pushPagePadding()).toHaveText(pushedPadding);
    });

    await test.step('closing System push C removes the padding', async () => {
      await app.closePushFlyout('System push C');
      await expect(app.pushPagePadding()).toHaveText(NONE);
    });
  });

  /**
   * https://github.com/elastic/eui/issues/10061, fixed by https://github.com/elastic/eui/pull/10062
   *
   * Closing the main flyout of a backgrounded session closed the foreground session instead.
   */
  test('elastic/eui#10061: closing the older of two system push flyouts keeps the newer one open', async ({
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;

    await test.step('open System push C, then System push D', async () => {
      await app.openPushFlyout('System push C');
      await app.openPushFlyout('System push D');
    });

    await test.step('closing System push C keeps D open and the page pushed', async () => {
      await app.closePushFlyout('System push C');
      await expect(app.pushFlyout('System push D')).toBeVisible();
      await expect(app.pushPagePadding()).not.toHaveText(NONE);
    });

    await test.step('closing System push D removes the padding', async () => {
      await app.closePushFlyout('System push D');
      await expect(app.pushPagePadding()).toHaveText(NONE);
    });
  });

  /**
   * https://github.com/elastic/eui/pull/10075
   *
   * A new system flyout was sized against the previous session's flyout as if they were side by
   * side, so a remembered width came back narrower, and alternated between two widths on every
   * open (seen in Security alert flyouts).
   */
  test('elastic/eui#10075: a second system push flyout opens at the width the first one was resized to', async ({
    page,
    pageObjects,
  }) => {
    const app = pageObjects.flyoutSystem;
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // With the bug, D is capped at the space left next to C (90% of the viewport minus C's
    // width), about 20% here. Anything over 60% means D got the remembered width.
    await test.step('resize System push C to about 70% of the viewport', async () => {
      await app.openPushFlyout('System push C');
      await expect(app.pushStoredWidth()).toHaveText(NONE);
      await app.dragPushFlyoutEdgeTo('System push C', viewportWidth * 0.3);
      await expect(app.pushStoredWidth()).not.toHaveText(NONE);
      await expect
        .poll(() => app.pushFlyoutWidth('System push C'))
        .toBeGreaterThan(viewportWidth * 0.6);
    });

    await test.step('System push D opens at about the same width', async () => {
      await app.openPushFlyout('System push D');
      await expect
        .poll(() => app.pushFlyoutWidth('System push D'))
        .toBeGreaterThan(viewportWidth * 0.6);
    });
  });
});
