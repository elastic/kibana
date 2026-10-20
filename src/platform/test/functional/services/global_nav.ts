/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { CHROME_HEADER_TEST_SUBJECTS } from '@kbn/core-chrome-browser-components';
import { FtrService } from '../ftr_provider_context';

/**
 * Capabilities that have no equivalent in project chrome yet. Callers that can run under project
 * chrome must branch on `globalNav.isProjectChrome()` before using them.
 */
const unsupportedInProjectChrome = (method: string): never => {
  throw new Error(
    `globalNav.${method}() is not supported in project chrome. Branch on globalNav.isProjectChrome() in the caller.`
  );
};

export class GlobalNavService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly config = this.ctx.getService('config');
  private readonly findTimeout = this.config.get('timeouts.find');

  /**
   * Visible page title from project chrome `appHeaderTitle` or legacy `EuiPageHeader` h1.
   */
  public async getPageTitle(): Promise<string> {
    const legacyTitleSelector = '.euiPageHeader h1.euiTitle';
    return await this.retry.try(async () => {
      if (await this.testSubjects.exists('appHeaderTitle')) {
        return await this.testSubjects.getVisibleText('appHeaderTitle');
      }
      if (await this.find.existsByCssSelector(legacyTitleSelector, 0)) {
        return await (await this.find.byCssSelector(legacyTitleSelector)).getVisibleText();
      }
      throw new Error('No page title has rendered');
    });
  }

  /**
   * True when project chrome is active. It renders the chrome header and, unlike the
   * classic header, no breadcrumb trail. Chrome style can
   * flip mid-session (e.g. entering a solution view), so this is probed per call.
   *
   * The active header can be briefly absent while navigating, so we wait until a known header is
   * displayed before deciding. Pages without a recognized header retain classic behavior.
   */
  public async isProjectChrome(): Promise<boolean> {
    const detectHeader = async (): Promise<boolean | undefined> => {
      if (await this.testSubjects.exists(CHROME_HEADER_TEST_SUBJECTS.root)) {
        return true;
      }
      if (await this.testSubjects.exists('headerGlobalNav')) {
        return false;
      }
      return undefined;
    };

    try {
      return await this.retry.tryForTime(this.findTimeout, async () => {
        const result = await detectHeader();
        if (result === undefined) {
          throw new Error('no chrome header has rendered yet');
        }
        return result;
      });
    } catch {
      return (await detectHeader()) ?? false;
    }
  }

  public async moveMouseToLogo(): Promise<void> {
    if (await this.isProjectChrome()) {
      return await this.testSubjects.moveMouseTo('nav-header-logo');
    }
    await this.testSubjects.moveMouseTo('headerGlobalNav > logo');
  }

  public async clickLogo(): Promise<void> {
    if (await this.isProjectChrome()) {
      return await this.testSubjects.click('nav-header-logo');
    }
    return await this.testSubjects.click('headerGlobalNav > logo');
  }

  public async exists(): Promise<boolean> {
    if (await this.isProjectChrome()) {
      return await this.testSubjects.exists(CHROME_HEADER_TEST_SUBJECTS.root);
    }
    return await this.testSubjects.exists('headerGlobalNav');
  }

  public async getLastBreadcrumb(): Promise<string> {
    if (await this.isProjectChrome()) {
      return await this.getPageTitle();
    }
    return await this.testSubjects.getVisibleText(
      'headerGlobalNav > breadcrumbs > ~breadcrumb & ~last'
    );
  }

  public async clickNewsfeed(): Promise<void> {
    if (!(await this.testSubjects.exists('helpMenuWhatsNewButton'))) {
      await this.testSubjects.click(CHROME_HEADER_TEST_SUBJECTS.helpButton);
    }
    await this.testSubjects.click('helpMenuWhatsNewButton');
  }

  public async getFirstBreadcrumb(): Promise<string> {
    if (await this.isProjectChrome()) {
      return unsupportedInProjectChrome('getFirstBreadcrumb');
    }
    return await this.testSubjects.getVisibleText(
      'headerGlobalNav > breadcrumbs > ~breadcrumb & ~first'
    );
  }

  public async badgeExistsOrFail(expectedLabel: string): Promise<void> {
    if (await this.isProjectChrome()) {
      return unsupportedInProjectChrome('badgeExistsOrFail');
    }
    await this.testSubjects.existOrFail('headerBadge');
    const actualLabel =
      (await this.testSubjects.getAttribute('headerBadge', 'data-test-badge-label')) ?? '';
    expect(actualLabel.toUpperCase()).to.equal(expectedLabel.toUpperCase());
  }

  public async badgeMissingOrFail(): Promise<void> {
    if (await this.isProjectChrome()) {
      return unsupportedInProjectChrome('badgeMissingOrFail');
    }
    await this.testSubjects.missingOrFail('headerBadge');
  }
}
