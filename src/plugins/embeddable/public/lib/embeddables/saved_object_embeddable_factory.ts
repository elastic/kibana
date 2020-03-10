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
import { SavedObjectAttributes, SimpleSavedObject } from 'kibana/public';
import { SavedObjectMetaData } from 'src/plugins/saved_objects/public';
import { SavedObjectEmbeddableInput, SavedObjectEmbeddableOutput } from './saved_object_embeddable';
import { EmbeddableFactory } from './embeddable_factory';
import { IEmbeddable } from './i_embeddable';

// interface StartServices {
//   getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
//   savedObjectsClient: SavedObjectsClient;
// }

export function isSavedObjectEmbeddableFactory(
  factory: EmbeddableFactory | SavedObjectEmbeddableFactory
): factory is SavedObjectEmbeddableFactory {
  return (factory as SavedObjectEmbeddableFactory).savedObjectMetaData !== undefined;
}

export abstract class SavedObjectEmbeddableFactory<
  I extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput,
  O extends SavedObjectEmbeddableOutput = SavedObjectEmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  SA extends SavedObjectAttributes = SavedObjectAttributes
> extends EmbeddableFactory<I, O, E, SA> {
  public savedObjectMetaData: SavedObjectMetaData<SA>;

  constructor({ savedObjectMetaData }: { savedObjectMetaData: SavedObjectMetaData<SA> }) {
    super({ savedObjectMetaData });
    this.savedObjectMetaData = savedObjectMetaData;
  }

  abstract canSave(embeddable: E): boolean;

  abstract save(embeddable: E): Promise<SimpleSavedObject>;
}
