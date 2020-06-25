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

/**
 * Represents a state package that contains the last active app id.
 * @public
 */
export interface EmbeddableOriginatingAppState {
  originatingApp: string;
}

export function isEmbeddableOriginatingAppState(
  state: unknown
): state is EmbeddableOriginatingAppState {
  return ensureFieldOfTypeExists('originatingApp', state, 'string');
}

/**
 * Represents a state package that contains all fields necessary to create an embeddable in a container.
 * @public
 */
export interface EmbeddablePackageState {
  type: string;
  id: string;
}

export function isEmbeddablePackageState(state: unknown): state is EmbeddablePackageState {
  return (
    ensureFieldOfTypeExists('type', state, 'string') &&
    ensureFieldOfTypeExists('id', state, 'string')
  );
}

function ensureFieldOfTypeExists(key: string, obj: unknown, type?: string): boolean {
  return (
    obj &&
    key in (obj as { [key: string]: unknown }) &&
    (!type || typeof (obj as { [key: string]: unknown })[key] === type)
  );
}
