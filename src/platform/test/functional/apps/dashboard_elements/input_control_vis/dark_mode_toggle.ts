/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TEMPORARY screenshot harness for PR #298989 — local runs only, do not commit.

import fs from 'fs';
import path from 'path';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const OUT_DIR = process.env.DARK_MODE_SHOTS_DIR ?? '/tmp/dark-mode-shots';
const LABEL = process.env.DARK_MODE_SHOTS_LABEL ?? 'unlabeled';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, visualize, timePicker } = getPageObjects(['common', 'visualize', 'timePicker']);
  const browser = getService('browser');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');

  const comboBoxColors = () =>
    browser.execute(() => {
      const wrapper = document.querySelector('[data-test-subj="listControlSelect0"]');
      const input = wrapper?.querySelector('.euiFormControlLayout, .euiComboBox__inputWrap');
      const target = (input ?? wrapper) as HTMLElement | null;
      if (!target) return null;
      const style = getComputedStyle(target);
      return { background: style.backgroundColor, color: style.color };
    });

  async function setDarkModeViaDevToolbar() {
    const expandSelector = '[aria-label="Expand developer toolbar"]';
    const toggleSelector = '[aria-label="Toggle color theme"]';
    // The toolbar mounts lazily; wait until it renders in either state.
    await retry.waitFor(
      'developer toolbar to render',
      async () =>
        (await find.existsByCssSelector(expandSelector, 500)) ||
        (await find.existsByCssSelector(toggleSelector, 500))
    );
    if (await find.existsByCssSelector(expandSelector, 500)) {
      await (await find.byCssSelector(expandSelector)).click();
    }
    const toggle = await find.byCssSelector('[aria-label="Toggle color theme"]');
    if ((await toggle.getVisibleText()).trim() === 'Dark') return;
    await toggle.click();
    await retry.waitFor('core theme to switch to dark', async () =>
      Boolean(
        await browser.execute(() =>
          (window as { __kbnThemeTag__?: string }).__kbnThemeTag__?.endsWith('dark')
        )
      )
    );
  }

  describe('dark mode toggle (temporary)', () => {
    before(async () => {
      await visualize.initTests();
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('visualize');
      await visualize.loadSavedVisualization('input control options', {
        navigateToVisualize: false,
      });
      await testSubjects.existOrFail('listControlSelect0');
    });

    it('list control follows a live theme switch', async () => {
      const light = await comboBoxColors();

      await setDarkModeViaDevToolbar();
      // The controller redraws on theme$; give React a beat to commit.
      await common.sleep(1500);

      const dark = await comboBoxColors();
      log.info(`[${LABEL}] combo box light=${JSON.stringify(light)} dark=${JSON.stringify(dark)}`);

      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(OUT_DIR, `${LABEL}-input-control.json`),
        JSON.stringify({ light, dark }, null, 2)
      );
      const png = await browser.takeScreenshot();
      fs.writeFileSync(path.join(OUT_DIR, `${LABEL}-input-control.png`), png, 'base64');
    });
  });
}
