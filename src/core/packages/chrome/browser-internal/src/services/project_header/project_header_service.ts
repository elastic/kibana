/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject } from 'rxjs';
import type { ChromeProjectHeaderConfig } from '@kbn/core-chrome-browser';
import { createState } from '../../state/state_helpers';

export class ProjectHeaderService {
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly config = createState<ChromeProjectHeaderConfig | undefined>(undefined);

  public start() {
    return {
      get$: () => this.config.$,
      set: (value?: ChromeProjectHeaderConfig) => this.config.set(value),
      /** @internal Reset to initial state (e.g. on app change). */
      reset: () => this.config.set(undefined),
    };
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();
  }
}
