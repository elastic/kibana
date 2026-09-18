/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compact, flattenDeep, isString } from 'lodash';
import type { Observable } from 'rxjs';
import { ReplaySubject, distinctUntilChanged } from 'rxjs';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';

export interface InternalChromeDocTitleSetup {
  title$: Observable<string>;
  titleParts$: Observable<readonly string[]>;
}

interface SetupDeps {
  document: { title: string };
}

const defaultTitle: string[] = [];
const titleSeparator = ' - ';

/** @internal */
export class DocTitleService {
  private document?: { title: string };
  private baseTitle?: string;
  private titleSubject = new ReplaySubject<string>(1);
  private titlePartsSubject = new ReplaySubject<readonly string[]>(1);

  public setup({ document }: SetupDeps): InternalChromeDocTitleSetup {
    this.document = document;
    this.baseTitle = document.title;
    this.titleSubject.next(this.baseTitle);
    this.titlePartsSubject.next([this.baseTitle]);

    return {
      title$: this.titleSubject.asObservable().pipe(distinctUntilChanged()),
      titleParts$: this.titlePartsSubject
        .asObservable()
        .pipe(distinctUntilChanged(areTitlePartsEqual)),
    };
  }

  public start(): ChromeDocTitle {
    if (this.document === undefined || this.baseTitle === undefined) {
      throw new Error('DocTitleService#setup must be called before DocTitleService#start');
    }

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
    const parts = this.getTitleParts(title);
    const rendered = parts.join(titleSeparator);
    this.document!.title = rendered;
    this.titleSubject.next(rendered);
    this.titlePartsSubject.next(parts);
  }

  private getTitleParts(title: string | string[]): string[] {
    const parts = [...(isString(title) ? [title] : title), this.baseTitle];
    // ensuring compat with legacy that might be passing nested arrays
    return compact(flattenDeep(parts));
  }
}

const areTitlePartsEqual = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((part, index) => part === right[index]);
