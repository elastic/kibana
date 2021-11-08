/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18Texts } from '../constants/texts';
import type { BreadcrumbType } from '../types';

type ChangeDocTitleHandler = (newTitle: string | string[]) => void;

class DocTitleService {
  private changeDocTitleHandler: ChangeDocTitleHandler = () => {};

  public setup(_changeDocTitleHandler: ChangeDocTitleHandler): void {
    this.changeDocTitleHandler = _changeDocTitleHandler;
  }

  public setTitle(page?: BreadcrumbType): void {
    if (!page || page === 'home') {
      this.changeDocTitleHandler(`${i18Texts.breadcrumbs.home}`);
    } else if (i18Texts.breadcrumbs[page]) {
      this.changeDocTitleHandler(`${i18Texts.breadcrumbs[page]} - ${i18Texts.breadcrumbs.home}`);
    }
  }
}

export const docTitleService = new DocTitleService();
