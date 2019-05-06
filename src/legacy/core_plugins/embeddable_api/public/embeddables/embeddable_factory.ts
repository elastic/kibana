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
import { EmbeddableInput, EmbeddableOutput } from './i_embeddable';
import { ErrorEmbeddable } from './error_embeddable';
import { IContainer } from '../containers/i_container';
import { IEmbeddable } from './i_embeddable';

export interface EmbeddableInstanceConfiguration {
  id: string;
  savedObjectId?: string;
}

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
  TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
  TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput,
  TEmbeddable extends IEmbeddable<TEmbeddableInput, TEmbeddableOutput> = IEmbeddable<
    TEmbeddableInput,
    TEmbeddableOutput
  >,
  TSavedObjectAttributes extends SavedObjectAttributes = SavedObjectAttributes
> {
  public readonly name: string;
  public readonly savedObjectMetaData?: SavedObjectMetaData<TSavedObjectAttributes>;

  public readonly isContainerType: boolean = false;

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
    savedObjectMetaData?: SavedObjectMetaData<TSavedObjectAttributes>;
  }) {
    this.name = name;
    this.savedObjectMetaData = savedObjectMetaData;
  }

  public abstract isEditable(): boolean;

  public abstract getDisplayName(): string;

  public canCreateNew() {
    return true;
  }

  public getDefaultInput(): Partial<TEmbeddableInput> {
    return {};
  }

  public getExplicitInput(): Promise<Partial<TEmbeddableInput>> {
    return Promise.resolve({});
  }

  /**
   *
   */
  public createFromSavedObject(
    savedObjectId: string,
    explicitInput: Partial<TEmbeddableInput>,
    parent?: IContainer
  ): Promise<TEmbeddable | ErrorEmbeddable> {
    throw new Error(`Creation from saved object not supported by type ${this.name}`);
  }

  /**
   * Resolves to undefined if a new Embeddable cannot be directly created and the user will instead be redirected
   * elsewhere.
   * This will likely change in future iterations when we improve in place editing capabilities.
   */
  public abstract create(
    initialInput: TEmbeddableInput,
    parent?: IContainer
  ): Promise<TEmbeddable | ErrorEmbeddable | undefined>;
}
