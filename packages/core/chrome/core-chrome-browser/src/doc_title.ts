/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
