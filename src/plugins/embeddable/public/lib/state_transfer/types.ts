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

import { Optional } from '@kbn/utility-types';
import { EmbeddableInput, SavedObjectEmbeddableInput } from '..';

/**
 * A state package that contains information an editor will need to create or edit an embeddable then redirect back.
 * @public
 */
export interface EmbeddableEditorState {
  originatingApp: string;
  embeddableId?: string;
  valueInput?: EmbeddableInput;
}

export function isEmbeddableEditorState(state: unknown): state is EmbeddableEditorState {
  return ensureFieldOfTypeExists('originatingApp', state, 'string');
}

/**
 * A state package that contains all fields necessary to create or update an embeddable by reference or by value in a container.
 * @public
 */
export interface EmbeddablePackageState {
  type: string;
  input: Optional<EmbeddableInput, 'id'> | Optional<SavedObjectEmbeddableInput, 'id'>;
  embeddableId?: string;
}

export function isEmbeddablePackageState(state: unknown): state is EmbeddablePackageState {
  return (
    ensureFieldOfTypeExists('type', state, 'string') &&
    ensureFieldOfTypeExists('input', state, 'object')
  );
}

function ensureFieldOfTypeExists(key: string, obj: unknown, type?: string): boolean {
  return (
    Boolean(obj) &&
    key in (obj as { [key: string]: unknown }) &&
    (!type || typeof (obj as { [key: string]: unknown })[key] === type)
  );
}
