/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { CustomBrandingStart } from '@kbn/core-custom-branding';

/** @internal */
export interface InternalCustomBrandingStart extends CustomBrandingStart {
  // Internal APIs
  getComponent(): JSX.Element | null;

  /**
   * The potential action menu set by the currently mounted app.
   * Consumed by the chrome header.
   *
   * @internal
   */
  customBranding$: Map<string, Observable<string>> | undefined;
}
