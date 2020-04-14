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

import { SavedObjectReference } from 'src/core/public';

type State = string | number | boolean | null | undefined | SerializableState;

interface SerializableState {
  [key: string]: State | State[];
}

type ExtractReferences<Id extends string> = (
  state: PersistableStates[Id]['state']
) => [PersistableStates[Id]['state'], SavedObjectReference[]];

type InjectReferences<Id extends string> = (
  state: PersistableStates[Id]['state'],
  references: SavedObjectReference[]
) => PersistableStates[Id]['state'];

type MigrateState<Id extends string> = <T extends SerializableState>(
  oldState: T
) => PersistableStates[Id]['state'];

/** @internal */
export interface PersistableStateContract<Id extends string> {
  id: Id;
  extractReferences: ExtractReferences<Id>;
  injectReferences: InjectReferences<Id>;
  migrate: MigrateState<Id>;
}

/**
 * Use this generic to wrap your persistable state interface before
 * adding it to the PersistableStates interface via `declare module`.
 *
 * We are providing this as a generic to make things more flexible
 * should we choose to add properties to the interface in the future.
 *
 * @public
 * TODO: should be <S extends SerializableState>
 */
export interface PersistableState<S extends unknown> {
  state: S;
}

/**
 * Anybody registering persistable state should add a property to this
 * interface so that any module importing PersistableStates can
 * have the interfaces of all persistable states available to them.
 *
 *  declare module '../../plugins/share/public' {
 *    interface PersistableStates {
 *      myId: PersistableState<MySerializableStateInterface>;
 *    }
 *  }
 *
 * @public
 */
export interface PersistableStates {
  // Fallback state for if someone forgets to use `declare module` to
  // add their state to this interface.
  // TODO: should be PersistableState<SerializableState>
  [key: string]: PersistableState<unknown>;
}

/**
 * These are options that can be added when registering persistable state.
 * If they are not provided, default noop functions will be provided by
 * the service.
 *
 * @public
 */
export interface PersistableStateDefinition<Id extends string> {
  extractReferences?: ExtractReferences<Id>;
  injectReferences?: InjectReferences<Id>;
  migrate?: MigrateState<Id>;
}
