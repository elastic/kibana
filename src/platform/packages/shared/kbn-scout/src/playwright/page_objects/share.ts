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
import { expect } from '..';
import type { KibanaUrl } from '../../common/services/kibana_url';

/**
 * Page object for the global Share top-nav, share modal, and short-URL
 * redirect prompts.
 *
 * Wraps interactions with the `shareTopNavButton`, `shareContextModal`, and
 * `copyShareUrlButton` test subjects so callers across plugins can open the
 * modal, read the snapshot share URL, and close the modal without duplicating
 * locator boilerplate. Also exposes navigation helpers used by the
 * `share` plugin's short-URL redirect tests.
 */
export class Share {
  public readonly shareButton: Locator;
  public readonly modal: Locator;
  public readonly copyUrlButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.shareButton = page.testSubj.locator('shareTopNavButton');
    this.modal = page.testSubj.locator('shareContextModal');
    this.copyUrlButton = page.testSubj.locator('copyShareUrlButton');
  }

  async openShareModal(): Promise<void> {
    await this.shareButton.click();
    await expect(this.modal).toBeVisible();
  }

  /**
   * Clicks the snapshot copy button and returns the resolved share URL from
   * the button's `data-share-url` attribute. Throws if the URL is missing.
   */
  async getSharedUrl(): Promise<string> {
    await expect(this.copyUrlButton).toBeEnabled();
    await this.copyUrlButton.click();
    await expect(this.copyUrlButton).toHaveAttribute('data-share-url', /.+/);
    const url = await this.copyUrlButton.getAttribute('data-share-url');
    if (!url) {
      throw new Error('Could not extract share URL from copyShareUrlButton');
    }
    return url;
  }

  async closeShareModal(): Promise<void> {
    await this.modal.locator('button[aria-label*="Close"]').click();
    await expect(this.modal).toBeHidden();
  }

  /**
   * Navigates to a short URL that does not exist, used to verify the
   * redirect error empty prompt.
   */
  async gotoNonExistentShortUrl(shortUrlId: string): Promise<void> {
    const url = this.kbnUrl.get(`/app/r/s/${shortUrlId}`);
    await this.page.goto(url);
  }

  async waitForErrorPrompt(): Promise<void> {
    await this.page.testSubj.locator('redirectErrorEmptyPromptBody').waitFor({ state: 'visible' });
  }

  async clickBackToHomeButton(): Promise<void> {
    await this.page.testSubj.locator('redirectErrorEmptyPromptButton').click();
  }
}
