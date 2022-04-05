/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectAttributes } from 'kibana/server';
import { IEmbeddable } from './i_embeddable';
import { EmbeddableFactory } from './embeddable_factory';
import { EmbeddableInput, EmbeddableOutput } from '..';

export type EmbeddableFactoryDefinition<
  I extends EmbeddableInput = EmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  T extends SavedObjectAttributes = SavedObjectAttributes
> =
  // Required parameters
  Pick<EmbeddableFactory<I, O, E, T>, 'create' | 'type' | 'isEditable' | 'getDisplayName'> &
    // Optional parameters
    Partial<
      Pick<
        EmbeddableFactory<I, O, E, T>,
        | 'createFromSavedObject'
        | 'isContainerType'
        | 'getExplicitInput'
        | 'savedObjectMetaData'
        | 'canCreateNew'
        | 'getDefaultInput'
        | 'telemetry'
        | 'extract'
        | 'inject'
        | 'migrations'
        | 'grouping'
        | 'getIconType'
        | 'getDescription'
      >
    >;
