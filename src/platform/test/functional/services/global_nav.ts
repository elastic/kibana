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
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly config = this.ctx.getService('config');
  private readonly findTimeout = this.config.get('timeouts.find');

  /**
   * Visible page title from chrome-next `appHeaderTitle` or legacy `EuiPageHeader` h1.
   */
  public async getPageTitle(): Promise<string> {
    const legacyTitleSelector = '.euiPageHeader h1.euiTitle';
    return await this.retry.try(async () => {
      if (await this.testSubjects.exists('appHeaderTitle', { timeout: 0 })) {
        return await this.testSubjects.getVisibleText('appHeaderTitle');
      }
      if (await this.find.existsByCssSelector(legacyTitleSelector, 0)) {
        return await (await this.find.byCssSelector(legacyTitleSelector)).getVisibleText();
      }
      throw new Error('No page title has rendered');
    });
  }

  /**
   * True when next-project chrome is active (feature flag on + project chrome style). It renders the
   * new global header and, unlike the classic/project headers, no breadcrumb trail. Chrome style can
   * flip mid-session (e.g. entering a solution view), so this is probed per call.
   *
   * The active header can be briefly absent while navigating, so we wait for one of the known headers
   * to settle before deciding. Pages without a recognized header retain classic behavior.
   */
  public async isNextProjectChrome(): Promise<boolean> {
    // The chrome shell renders exactly one of these headers once loaded, but none while navigating,
    // so wait for whichever appears before deciding rather than probing a single header once.
    const anyHeaderSelector = ['chromeNextGlobalHeader', 'headerGlobalNav', 'kibanaProjectHeader']
      .map((subj) => `[data-test-subj="${subj}"]`)
      .join(',');

    if (!(await this.find.existsByCssSelector(anyHeaderSelector, this.findTimeout))) {
      return false;
    }

    return await this.testSubjects.exists('chromeNextGlobalHeader', { timeout: 0 });
  }

  public async moveMouseToLogo(): Promise<void> {
    if (await this.isNextProjectChrome()) {
      return await this.testSubjects.moveMouseTo('nav-header-logo');
    }
    await this.testSubjects.moveMouseTo('headerGlobalNav > logo');
  }

  public async clickLogo(): Promise<void> {
    if (await this.isNextProjectChrome()) {
      return await this.testSubjects.click('nav-header-logo');
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
      return await this.getPageTitle();
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
