/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { AppUnmount, Mounter } from './types';
import { ApplicationService } from './application_service';

/** @internal */
export type ApplicationServiceContract = PublicMethodsOf<ApplicationService>;
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
