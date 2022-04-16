/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectAttributes } from '@kbn/core/public';
import { EmbeddableFactoryDefinition } from './embeddable_factory_definition';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { EmbeddableFactory } from './embeddable_factory';
import { EmbeddableStateWithType } from '../../../common/types';
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
    canCreateNew: def.canCreateNew ? def.canCreateNew.bind(def) : () => true,
    getDefaultInput: def.getDefaultInput ? def.getDefaultInput.bind(def) : () => ({}),
    getExplicitInput: def.getExplicitInput
      ? def.getExplicitInput.bind(def)
      : () => Promise.resolve({}),
    createFromSavedObject: def.createFromSavedObject
      ? def.createFromSavedObject.bind(def)
      : (savedObjectId: string, input: Partial<I>, parent?: IContainer) => {
          throw new Error(`Creation from saved object not supported by type ${def.type}`);
        },
    create: def.create.bind(def),
    type: def.type,
    isEditable: def.isEditable.bind(def),
    getDisplayName: def.getDisplayName.bind(def),
    getDescription: def.getDescription ? def.getDescription.bind(def) : () => '',
    getIconType: def.getIconType ? def.getIconType.bind(def) : () => 'empty',
    savedObjectMetaData: def.savedObjectMetaData,
    telemetry: def.telemetry || (() => ({})),
    inject: def.inject || ((state: EmbeddableStateWithType) => state),
    extract: def.extract || ((state: EmbeddableStateWithType) => ({ state, references: [] })),
    migrations: def.migrations || {},
    grouping: def.grouping,
  };
  return factory;
};
