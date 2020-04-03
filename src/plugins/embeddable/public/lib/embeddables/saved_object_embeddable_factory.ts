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
import { SavedObjectAttributes } from 'kibana/public';
import { SavedObjectMetaData } from 'src/plugins/saved_objects/public';
import { SavedObjectEmbeddableInput, SavedObjectEmbeddableOutput } from './saved_object_embeddable';
import { EmbeddableFactory } from './embeddable_factory';
import { IEmbeddable } from './i_embeddable';
import { EmbeddableFactoryDefinition } from './embeddable_factory_definition';
import { IContainer, ErrorEmbeddable } from '..';

export function isSavedObjectEmbeddableFactory(
  factory: EmbeddableFactory | SavedObjectEmbeddableFactory
): factory is SavedObjectEmbeddableFactory {
  return (factory as SavedObjectEmbeddableFactory).savedObjectMetaData !== undefined;
}

export interface SavedObjectEmbeddableFactory<
  I extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput,
  O extends SavedObjectEmbeddableOutput = SavedObjectEmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  SA extends SavedObjectAttributes = SavedObjectAttributes
> extends EmbeddableFactory<I, O, E> {
  /**
   * Creates a new embeddable instance based off the saved object id.
   * @param savedObjectId
   * @param input - some input may come from a parent, or user, if it's not stored with the saved object. For example, the time
   * range of the parent container.
   * @param parent
   */
  createFromSavedObject(
    savedObjectId: string,
    input: Partial<I>,
    parent?: IContainer
  ): Promise<E | ErrorEmbeddable>;

  savedObjectMetaData: SavedObjectMetaData<SA>;
}

export type SavedObjectEmbeddableFactoryDefinition<
  I extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput,
  O extends SavedObjectEmbeddableOutput = SavedObjectEmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  SA extends SavedObjectAttributes = SavedObjectAttributes
> =
  // Required parameters
  Pick<
    SavedObjectEmbeddableFactory<I, O, E, SA>,
    | 'savedObjectMetaData'
    // TODO: get rid of this function:
    | 'createFromSavedObject'
  > &
    EmbeddableFactoryDefinition;
