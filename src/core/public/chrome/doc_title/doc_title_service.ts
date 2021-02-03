/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { compact, flattenDeep, isString } from 'lodash';

interface StartDeps {
  document: { title: string };
}

/**
 * APIs for accessing and updating the document title.
 *
 * @example
 * How to change the title of the document
 * ```ts
 * chrome.docTitle.change('My application')
 * ```
 *
 * @example
 * How to reset the title of the document to it's initial value
 * ```ts
 * chrome.docTitle.reset()
 * ```
 *
 * @public
 * */
export interface ChromeDocTitle {
  /**
   * Changes the current document title.
   *
   * @example
   * How to change the title of the document
   * ```ts
   * chrome.docTitle.change('My application title')
   * chrome.docTitle.change(['My application', 'My section'])
   * ```
   *
   * @param newTitle The new title to set, either a string or string array
   */
  change(newTitle: string | string[]): void;
  /**
   * Resets the document title to it's initial value.
   * (meaning the one present in the title meta at application load.)
   */
  reset(): void;
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
