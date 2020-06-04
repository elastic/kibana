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

import { SavedObjectEmbeddableInput } from '../../../../src/plugins/embeddable/public';
import { SavedObjectsClientContract } from '../../../../src/core/public';

type Common<A, B> = {
  [P in keyof A & keyof B]: A[P] | B[P];
};

function isRefType<RefType extends SavedObjectEmbeddableInput>(input: unknown): input is RefType {
  return !!(input as SavedObjectEmbeddableInput).savedObjectId;
}

export async function testUnWrap<
  SavedObjectAttributes,
  ValType extends SavedObjectAttributes = SavedObjectAttributes,
  RefType extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
>(
  input: RefType | ValType,
  savedObjectsClient: SavedObjectsClientContract,
  type: string
): Promise<ValType> {
  if (isRefType<RefType>(input)) {
    const savedObject = await savedObjectsClient.get<SavedObjectAttributes>(
      type,
      input.savedObjectId
    );
    const commonInput = input as Common<RefType, ValType>;
    return { ...commonInput, ...savedObject } as ValType;
  } else {
    return input as ValType;
  }
}
