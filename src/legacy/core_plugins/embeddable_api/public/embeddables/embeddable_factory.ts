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
  // A unique identified for this factory, which will be used to map an embeddable spec to
  // a factory that can generate an instance of it.
  public abstract readonly type: string;

  public readonly savedObjectMetaData?: SavedObjectMetaData<TSavedObjectAttributes>;

  /**
   * True is this factory create embeddables that are Containers.  Used in the add panel to
   * conditionally show whether these can be added to another container.  It's just not
   * supported right now, but once nested containers are officially supported we can probably get
   * rid of this interface.
   */
  public readonly isContainerType: boolean = false;

  constructor({
    savedObjectMetaData,
  }: {
    savedObjectMetaData?: SavedObjectMetaData<TSavedObjectAttributes>;
  } = {}) {
    this.savedObjectMetaData = savedObjectMetaData;
  }

  /**
   * Returns whether the current user should be allowed to edit this type of
   * embeddable.
   */
  public abstract isEditable(): boolean;

  /**
   * Returns a display name for this type of embeddable. Used in "Create new... " options
   * in the add panel for containers.
   */
  public abstract getDisplayName(): string;

  /**
   * If false, this type of embeddable can't be created with the "createNew" functionality. Instead,
   * use createFromSavedObject, where an existing saved object must first exist.
   */
  public canCreateNew() {
    return true;
  }

  /**
   * Can be used to get any default input, to be passed in to during the creation process. Default
   * input will not be stored in a parent container, so any inherited input from a container will trump
   * default input parameters.
   * @param partial
   */
  public getDefaultInput(partial: Partial<TEmbeddableInput>): Partial<TEmbeddableInput> {
    return {};
  }

  /**
   * Can be used to request explicit input from the user, to be passed in to `EmbeddableFactory:create`.
   * Explicit input is stored on the parent container for this embeddable. It overrides any inherited
   * input passed down from the parent container.
   */
  public async getExplicitInput(): Promise<Partial<TEmbeddableInput>> {
    return {};
  }

  /**
   * Creates a new embeddable instance based off the saved object id.
   * @param savedObjectId
   * @param input - some input may come from a parent, or user, if it's not stored with the saved object. For example, the time
   * range of the parent container.
   * @param parent
   */
  public createFromSavedObject(
    savedObjectId: string,
    input: Partial<TEmbeddableInput>,
    parent?: IContainer
  ): Promise<TEmbeddable | ErrorEmbeddable> {
    throw new Error(`Creation from saved object not supported by type ${this.type}`);
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
