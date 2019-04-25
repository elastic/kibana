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

import { SavedObjectMetaData } from 'ui/saved_objects/components/saved_object_finder';
import { SavedObjectAttributes } from '../../../../server/saved_objects';
import { Embeddable, EmbeddableInput, EmbeddableOutput } from './embeddable';
import { ErrorEmbeddable } from './error_embeddable';
import { Container, ContainerOutput } from '../containers';
import { ContainerInput } from '../containers/i_container';

export interface EmbeddableInstanceConfiguration {
  id: string;
  savedObjectId?: string;
}

export type AnyEmbeddableFactory = EmbeddableFactory;

export interface PropertySpec {
  displayName: string;
  accessPath: string;
  id: string;
  description: string;
  value?: string;
}

export interface OutputSpec {
  [key: string]: PropertySpec;
}

/**
 * The EmbeddableFactory creates and initializes an embeddable instance
 */
export abstract class EmbeddableFactory<
  I extends EmbeddableInput = EmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput,
  E extends Embeddable<I, O> = Embeddable<I, O>,
  T extends SavedObjectAttributes = SavedObjectAttributes
> {
  public readonly name: string;
  public readonly savedObjectMetaData?: SavedObjectMetaData<T>;

  /**
   *
   * @param name - a unique identified for this factory, which will be used to map an embeddable spec to
   * a factory that can generate an instance of it.
   */
  constructor({
    name,
    savedObjectMetaData,
  }: {
    name: string;
    savedObjectMetaData?: SavedObjectMetaData<T>;
  }) {
    this.name = name;
    this.savedObjectMetaData = savedObjectMetaData;
  }

  public abstract getOutputSpec(): OutputSpec;

  public isEditable() {
    return true;
  }

  public getDefaultInputParameters(): Partial<I> {
    return {};
  }

  /**
   *
   */
  public createFromSavedObject<
    CEI extends Partial<EmbeddableInput> = {},
    CI extends ContainerInput = ContainerInput,
    CO extends ContainerOutput = ContainerOutput
  >(
    savedObjectId: string,
    explicitInput: Partial<I>,
    parent?: Container<CEI, CI, CO>
  ): Promise<E | ErrorEmbeddable> {
    throw new Error(`Creation from saved object not supported by type ${this.name}`);
  }

  /**
   */
  public abstract create<
    CEI extends Partial<EmbeddableInput> = {},
    CI extends ContainerInput = ContainerInput,
    CO extends ContainerOutput = ContainerOutput
  >(initialInput: I, parent?: Container<CEI, CI, CO>): Promise<E | ErrorEmbeddable>;
}
