/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { ChromeStart } from '@kbn/core-chrome-browser';

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Used only by the rendering service to render the header UI
   * @internal
   */
  getHeaderComponent(): JSX.Element;

  /**
   * Used only by the rendering service to retrieve the set of classNames
   * that will be set on the body element.
   * @internal
   */
  getBodyClasses$(): Observable<string[]>;
}
