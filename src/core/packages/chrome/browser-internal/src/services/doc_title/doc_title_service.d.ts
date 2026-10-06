/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';
export interface InternalChromeDocTitleSetup {
  title$: Observable<string>;
  titleParts$: Observable<readonly string[]>;
}
interface SetupDeps {
  document: {
    title: string;
  };
}
/** @internal */
export declare class DocTitleService {
  private document?;
  private baseTitle?;
  private titleSubject;
  private titlePartsSubject;
  setup({ document }: SetupDeps): InternalChromeDocTitleSetup;
  start(): ChromeDocTitle;
  private applyTitle;
  private getTitleParts;
}
export {};
