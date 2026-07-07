/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class EmbeddingService extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly log = this.ctx.getService('log');
  private readonly header = this.ctx.getPageObject('header');

  /**
   * Opens current page in embeded mode
   */
  public async openInEmbeddedMode(): Promise<void> {
    const currentUrl = await this.browser.getCurrentUrl();
    this.log.debug(`Opening in embedded mode: ${currentUrl}`);
    await this.browser.get(`${currentUrl}&embed=true`);
    await this.header.waitUntilLoadingHasFinished();
  }
}
