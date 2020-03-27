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
import { EmbeddableFactoryDefinition } from './embeddable_factory_definition';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { EmbeddableFactory } from './embeddable_factory';
import { IContainer } from '..';

export const defaultEmbeddableFactoryProvider = <
  I extends EmbeddableInput = EmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  T extends SavedObjectAttributes = SavedObjectAttributes
>(
  def: EmbeddableFactoryDefinition<I, O, E, T>
): EmbeddableFactory<I, O, E, T> => {
  const factory: EmbeddableFactory<I, O, E, T> = {
    isContainerType: def.isContainerType ?? false,
    canCreateNew: def.canCreateNew ?? (() => true),
    getDefaultInput: def.getDefaultInput ?? (() => ({})),
    getExplicitInput: def.getExplicitInput ?? (() => Promise.resolve({})),
    createFromSavedObject:
      def.createFromSavedObject ??
      ((savedObjectId: string, input: Partial<I>, parent?: IContainer) => {
        throw new Error(`Creation from saved object not supported by type ${def.type}`);
      }),
    create: def.create,
    type: def.type,
    isEditable: def.isEditable,
    getDisplayName: def.getDisplayName,
    savedObjectMetaData: def.savedObjectMetaData,
  };
  return factory;
};
