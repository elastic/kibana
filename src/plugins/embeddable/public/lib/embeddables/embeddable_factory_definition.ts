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
      >
    >;
