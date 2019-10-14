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

import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { compact, flattenDeep, isString, isArray } from 'lodash';
import { takeUntil } from 'rxjs/operators';

interface StartDeps {
  document: { title: string };
}

/**
 * {@link ChromeDocTitle | APIs} for accessing and updating the document title.
 *
 * @example
 * How to change the title of the document
 * ```ts
 * chrome.docTitle.change({ parts: ['My application'], excludeBase: true })
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
   * Gets an observable of the current document title.
   */
  get$: () => Observable<string>;
  /**
   * Changes the current document title.
   *
   * @remarks
   * The apply option is mostly here for legacy compatibility reasons and it's default value
   * should probably always be used.
   *
   * @example
   * How to change the title of the document
   * ```ts
   * chrome.docTitle.change('My application title')
   * chrome.docTitle.change(['My application', 'My section'])
   * chrome.docTitle.change({ parts: ['My application'], excludeBase: true })
   * ```
   *
   * @param newTitle The new title to set, either a string, string array or {@link ChromeDocTitleEntry}
   * @param [apply=true] If false, will not actually apply the new title until #apply() is called.
   */
  change: (newTitle: ChromeDocTitleChange, apply?: boolean) => void;
  /**
   * Resets the document title to it's initial value.
   * (meaning the one present in the title meta at application load.)
   *
   * @remarks
   * The apply option is mostly here for legacy compatibility reasons and it's default value
   * should probably always be used.
   *
   * @param [apply=true] If false, will not actually apply the new title until #apply() is called.
   */
  reset: (apply?: boolean) => void;
  /**
   * Apply a title change or reset that was not applied yet.
   *
   * @see {DocTitle#change}
   * @see {DocTitle#reset}
   */
  apply: () => void;
  /** @internal */
  __legacy: {
    setBaseTitle: (baseTitle: string) => void;
  };
}

/** @public */
export interface ChromeDocTitleEntry {
  parts: string[];
  excludeBase?: boolean;
}

/**
 * Composed type for the {@link ChromeDocTitle#change} possible inputs.
 *
 * @public
 */
export type ChromeDocTitleChange = string | string[] | ChromeDocTitleEntry;

const defaultTitle: ChromeDocTitleEntry = { parts: [], excludeBase: false };

const inputToEntry = (input: ChromeDocTitleChange): ChromeDocTitleEntry => {
  if (isString(input)) {
    return {
      parts: [input],
      excludeBase: false,
    };
  }
  if (isArray<string>(input)) {
    return {
      parts: [...input],
      excludeBase: false,
    };
  }
  return input;
};

/** @internal */
export class DocTitleService {
  private document = { title: '' };
  private baseTitle = '';
  private current = defaultTitle;
  private readonly title$ = new BehaviorSubject<string>('');
  private readonly stop$ = new ReplaySubject(1);

  public start({ document }: StartDeps): ChromeDocTitle {
    this.document = document;
    this.baseTitle = document.title;
    this.title$.next(this.baseTitle);

    return {
      get$: () => this.title$.pipe(takeUntil(this.stop$)),
      change: (title: ChromeDocTitleChange, apply = true) => {
        this.current = inputToEntry(title);
        if (apply) {
          this.applyTitle();
        }
      },
      reset: (apply = true) => {
        this.current = defaultTitle;
        if (apply) {
          this.applyTitle();
        }
      },
      apply: () => {
        this.applyTitle();
      },
      __legacy: {
        setBaseTitle: baseTitle => {
          this.baseTitle = baseTitle;
        },
      },
    };
  }

  public stop() {
    this.stop$.next();
  }

  private applyTitle() {
    const rendered = this.render(this.current);
    this.document.title = rendered;
    this.title$.next(rendered);
  }

  private render(title: ChromeDocTitleEntry) {
    const parts = [...title.parts];
    if (!title.excludeBase) {
      parts.push(this.baseTitle);
    }
    // ensuring compat with legacy
    return compact(flattenDeep(parts)).join(' - ');
  }
}
