/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compact, flattenDeep, isString } from 'lodash';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';

interface StartDeps {
  document: { title: string };
}

const defaultTitle: string[] = [];
const titleSeparator = ' - ';

/** @internal */
export class DocTitleService {
  private document = { title: '' };
  private baseTitle = '';

  public start({ document }: StartDeps): ChromeDocTitle {
    this.document = document;
    this.baseTitle = document.title;

    return {
      change: (title: string | string[]) => {
        this.applyTitle(title);
      },
      reset: () => {
        this.applyTitle(defaultTitle);
      },
    };
  }

  private applyTitle(title: string | string[]) {
    this.document.title = this.render(title);
  }

  private render(title: string | string[]) {
    const parts = [...(isString(title) ? [title] : title), this.baseTitle];
    // ensuring compat with legacy that might be passing nested arrays
    return compact(flattenDeep(parts)).join(titleSeparator);
  }
}
