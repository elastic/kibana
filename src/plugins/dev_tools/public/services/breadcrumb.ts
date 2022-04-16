/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { i18Texts } from '../constants/texts';

export type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

export class BreadcrumbService {
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;
  }

  public setBreadcrumbs(page: string): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error('Breadcrumb service has not been initialized');
    }

    if (!page || page === 'home') {
      this.setBreadcrumbsHandler([{ text: i18Texts.breadcrumbs.home }]);
    } else {
      this.setBreadcrumbsHandler([{ text: i18Texts.breadcrumbs.home, href: '#/' }, { text: page }]);
    }
  }
}
