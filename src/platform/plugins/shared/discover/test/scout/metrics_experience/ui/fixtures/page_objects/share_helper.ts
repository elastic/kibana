/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export interface ShareHelper {
  readonly shareButton: Locator;
  readonly modal: Locator;
  readonly copyUrlButton: Locator;
  openShareModal: () => Promise<void>;
  getSharedUrl: () => Promise<string>;
  closeShareModal: () => Promise<void>;
}

export function createShareHelper(page: ScoutPage): ShareHelper {
  const shareButton = page.testSubj.locator('shareTopNavButton');
  const modal = page.testSubj.locator('shareContextModal');
  const copyUrlButton = page.testSubj.locator('copyShareUrlButton');

  return {
    shareButton,
    modal,
    copyUrlButton,

    openShareModal: async () => {
      await shareButton.click();
      await expect(modal).toBeVisible();
    },

    getSharedUrl: async () => {
      await copyUrlButton.click();
      await expect(copyUrlButton).toHaveAttribute('data-share-url', /.+/);
      const url = await copyUrlButton.getAttribute('data-share-url');
      if (!url) {
        throw new Error('Could not extract share URL from copyShareUrlButton');
      }
      return url;
    },

    closeShareModal: async () => {
      await modal.locator('button[aria-label*="Close"]').click();
      await expect(modal).toBeHidden();
    },
  };
}
