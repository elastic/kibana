/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject } from 'rxjs';
import type { ChromeNextHeaderConfig } from '@kbn/core-chrome-browser';
import { createState } from '../../state/state_helpers';

export class NextHeaderService {
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly config = createState<ChromeNextHeaderConfig | undefined>(undefined);

  public start() {
    return {
      get$: () => this.config.$,
      set: (partial: Partial<ChromeNextHeaderConfig>) => {
        const current = this.config.get() ?? {};
        const next = { ...current };
        for (const [key, value] of Object.entries(partial)) {
          if (value !== undefined) {
            (next as Record<string, unknown>)[key] = value;
          }
        }
        this.config.set(
          Object.keys(next).length > 0 ? (next as ChromeNextHeaderConfig) : undefined
        );
      },
      reset: (...keys: Array<keyof ChromeNextHeaderConfig>) => {
        if (keys.length === 0) {
          this.config.set(undefined);
          return;
        }
        const current = this.config.get();
        if (!current) return;
        const next = { ...current };
        for (const key of keys) {
          delete next[key];
        }
        this.config.set(Object.keys(next).length > 0 ? next : undefined);
      },
    };
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();
  }
}
