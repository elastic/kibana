/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CombinedEmulator } from '../fetch/combine_emulators';
import type { Emulator } from '../fetch/create_emulator_fetch';
import type { OperationDescription } from '../fetch/describe_operation';

/** What the control endpoints serve: an emulator, or several combined by `combineEmulators`. */
export interface ControlledEmulator extends Pick<Emulator, 'calls' | 'operations'> {
  /** Empties the calls of `connector`, or all calls, with the state and runtime fixtures. */
  readonly reset: (connector?: string) => void;
  /** Set for combined emulators: the connectors `?connector=` can scope the endpoints to. */
  readonly connectors?: readonly string[];
  readonly runtimeFixtures: CombinedEmulator['runtimeFixtures'];
  readonly describeOperation: (
    id: string,
    options?: { readonly source?: string; readonly connector?: string }
  ) => OperationDescription | undefined;
}
