/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  /** @internal */
  __legacy: {
    setBaseTitle(baseTitle: string): void;
  };
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
      __legacy: {
        setBaseTitle: baseTitle => {
          this.baseTitle = baseTitle;
        },
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
