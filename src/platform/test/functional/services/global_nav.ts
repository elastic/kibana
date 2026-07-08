/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

/**
 * Capabilities that have no equivalent in next-project chrome yet. Callers that can run under project
 * chrome must branch on `globalNav.isNextProjectChrome()` before using them.
 */
const unsupportedInNextChrome = (method: string): never => {
  throw new Error(
    `globalNav.${method}() is not supported in next-project chrome. Branch on globalNav.isNextProjectChrome() in the caller.`
  );
};

export class GlobalNavService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');

  /**
   * True when next-project chrome is active (feature flag on + project chrome style). It renders the
   * new global header and, unlike the classic/project headers, no breadcrumb trail. Chrome style can
   * flip mid-session (e.g. entering a solution view), so this is probed per call.
   */
  public async isNextProjectChrome(): Promise<boolean> {
    return await this.testSubjects.exists('chromeNextGlobalHeader', { timeout: 0 });
  }

  public async moveMouseToLogo(): Promise<void> {
    if (await this.isNextProjectChrome()) {
      return await this.testSubjects.moveMouseTo('chromeNextGlobalHeaderLogo');
    }
    await this.testSubjects.moveMouseTo('headerGlobalNav > logo');
  }

  public async clickLogo(): Promise<void> {
    if (await this.isNextProjectChrome()) {
      return await this.testSubjects.click('chromeNextGlobalHeaderLogo');
    }
    return await this.testSubjects.click('headerGlobalNav > logo');
  }

  public async exists(): Promise<boolean> {
    if (await this.isNextProjectChrome()) {
      return await this.testSubjects.exists('chromeNextGlobalHeader');
    }
    return await this.testSubjects.exists('headerGlobalNav');
  }

  public async getLastBreadcrumb(): Promise<string> {
    if (await this.isNextProjectChrome()) {
      // Next-project chrome renders the active page title in the app header instead of a breadcrumb.
      return await this.testSubjects.getVisibleText('appHeaderTitle');
    }
    return await this.testSubjects.getVisibleText(
      'headerGlobalNav > breadcrumbs > ~breadcrumb & ~last'
    );
  }

  public async clickNewsfeed(): Promise<void> {
    if (await this.isNextProjectChrome()) {
      return unsupportedInNextChrome('clickNewsfeed');
    }
    return await this.testSubjects.click('headerGlobalNav > ^newsfeed');
  }

  public async getFirstBreadcrumb(): Promise<string> {
    if (await this.isNextProjectChrome()) {
      return unsupportedInNextChrome('getFirstBreadcrumb');
    }
    return await this.testSubjects.getVisibleText(
      'headerGlobalNav > breadcrumbs > ~breadcrumb & ~first'
    );
  }

  public async badgeExistsOrFail(expectedLabel: string): Promise<void> {
    if (await this.isNextProjectChrome()) {
      return unsupportedInNextChrome('badgeExistsOrFail');
    }
    await this.testSubjects.existOrFail('headerBadge');
    const actualLabel =
      (await this.testSubjects.getAttribute('headerBadge', 'data-test-badge-label')) ?? '';
    expect(actualLabel.toUpperCase()).to.equal(expectedLabel.toUpperCase());
  }

  public async badgeMissingOrFail(): Promise<void> {
    if (await this.isNextProjectChrome()) {
      return unsupportedInNextChrome('badgeMissingOrFail');
    }
    await this.testSubjects.missingOrFail('headerBadge');
  }
}
