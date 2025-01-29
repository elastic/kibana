/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tap } from 'rxjs';
import { createFailError } from '@kbn/dev-cli-errors';

import { pipeClosure } from '../common';
import { OptimizerUpdate$ } from '../run_optimizer';

import { OptimizerState } from './optimizer_state';
import { OptimizerConfig } from './optimizer_config';

export function handleOptimizerCompletion(config: OptimizerConfig) {
  return pipeClosure((update$: OptimizerUpdate$) => {
    let prevState: OptimizerState | undefined;

    return update$.pipe(
      tap({
        next: (update) => {
          prevState = update.state;
        },
        complete: () => {
          if (config.watch) {
            throw new Error('optimizer unexpectedly completed when in watch mode');
          }

          if (prevState?.phase === 'success') {
            return;
          }

          if (prevState?.phase === 'issue') {
            throw createFailError('webpack issue');
          }

          throw new Error(`optimizer unexpectedly exit in phase "${prevState?.phase}"`);
        },
      })
    );
  });
}
