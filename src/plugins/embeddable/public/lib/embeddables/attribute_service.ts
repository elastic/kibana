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

import { SavedObjectsClientContract } from '../../../../../core/public';
import {
  SavedObjectEmbeddableInput,
  isSavedObjectEmbeddableInput,
  EmbeddableInput,
  IEmbeddable,
} from '.';
import { SimpleSavedObject } from '../../../../../core/public';

export class AttributeService<
  SavedObjectAttributes,
  ValType extends EmbeddableInput & { attributes: SavedObjectAttributes },
  RefType extends SavedObjectEmbeddableInput
> {
  constructor(private type: string, private savedObjectsClient: SavedObjectsClientContract) {}

  public async unwrapAttributes(input: RefType | ValType): Promise<SavedObjectAttributes> {
    if (isSavedObjectEmbeddableInput(input)) {
      const savedObject: SimpleSavedObject<SavedObjectAttributes> = await this.savedObjectsClient.get<
        SavedObjectAttributes
      >(this.type, input.savedObjectId);
      return savedObject.attributes;
    }
    return input.attributes;
  }

  public async wrapAttributes(
    newAttributes: SavedObjectAttributes,
    useRefType: boolean,
    embeddable?: IEmbeddable
  ): Promise<Omit<ValType | RefType, 'id'>> {
    const savedObjectId =
      embeddable && isSavedObjectEmbeddableInput(embeddable.getInput())
        ? (embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId
        : undefined;

    if (useRefType) {
      if (savedObjectId) {
        await this.savedObjectsClient.update(this.type, savedObjectId, newAttributes);
        return { savedObjectId } as RefType;
      } else {
        const savedItem = await this.savedObjectsClient.create(this.type, newAttributes);
        return { savedObjectId: savedItem.id } as RefType;
      }
    } else {
      return { attributes: newAttributes } as ValType;
    }
  }
}
