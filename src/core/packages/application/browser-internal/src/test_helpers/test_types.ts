/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppUnmount } from '@kbn/core-application-browser';
import { Mounter } from '../types';
import { ApplicationService } from '../application_service';

/** @internal */
export type MockedUnmount = jest.Mocked<AppUnmount>;

/** @internal */
export interface Mountable {
  mounter: MockedMounter;
  unmount: MockedUnmount;
}

/** @internal */
export type MockedMounter = jest.Mocked<Mounter>;
/** @internal */
export type MockedMounterTuple = [string, Mountable];
/** @internal */
export type MockedMounterMap = Map<string, Mountable>;
/** @internal */
export type MockLifecycle<
  T extends keyof ApplicationService,
  U = Parameters<ApplicationService[T]>[0]
> = { [P in keyof U]: jest.Mocked<U[P]> };
