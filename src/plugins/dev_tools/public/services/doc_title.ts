/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18Texts } from '../constants/texts';

type ChangeDocTitleHandler = (newTitle: string | string[]) => void;

export class DocTitleService {
  private changeDocTitleHandler: ChangeDocTitleHandler = () => {};

  public setup(_changeDocTitleHandler: ChangeDocTitleHandler): void {
    this.changeDocTitleHandler = _changeDocTitleHandler;
  }

  public setTitle(page: string): void {
    if (!this.changeDocTitleHandler) {
      throw new Error('DocTitle service has not been initialized');
    }

    if (!page || page === 'home') {
      this.changeDocTitleHandler(i18Texts.breadcrumbs.home);
    } else {
      this.changeDocTitleHandler(`${page} - ${i18Texts.breadcrumbs.home}`);
    }
  }
}
