/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ManagementAppMountParams } from '../../../management/public';
import { i18Texts } from '../constants/texts';
import type { BreadcrumbType } from '../types';

export type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

export class BreadcrumbService {
  private breadcrumbs: {
    [key: string]: Array<{
      text: string;
      href?: string;
    }>;
  } = {
    console: [
      { text: i18Texts.breadcrumbs.home, href: '#/' },
      { text: i18Texts.breadcrumbs.console },
    ],
    searchProfiler: [
      { text: i18Texts.breadcrumbs.home, href: '#/' },
      { text: i18Texts.breadcrumbs.searchProfiler },
    ],
    grokDebugger: [
      { text: i18Texts.breadcrumbs.home, href: '#/' },
      { text: i18Texts.breadcrumbs.grokDebugger },
    ],
    painlessLab: [
      { text: i18Texts.breadcrumbs.home, href: '#/' },
      { text: i18Texts.breadcrumbs.painlessLab },
    ],
  };

  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;
  }

  public setBreadcrumbs(type: BreadcrumbType): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error('Breadcrumb service has not been initialized');
    }

    const newBreadcrumbs = this.breadcrumbs[type]
      ? [...this.breadcrumbs[type]]
      : [...this.breadcrumbs.home];

    this.setBreadcrumbsHandler(newBreadcrumbs);
  }
}

export const breadcrumbService = new BreadcrumbService();
