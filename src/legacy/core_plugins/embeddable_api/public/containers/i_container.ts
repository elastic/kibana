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

import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  EmbeddableFactory,
} from '../embeddables';
import { IEmbeddable } from '../embeddables/i_embeddable';

export interface PanelState<
  E extends { [key: string]: unknown } & { id: string } = { [key: string]: unknown } & {
    id: string;
  }
> {
  savedObjectId?: string;

  // The type of embeddable in this panel. Will be used to find the factory in which to
  // load the embeddable.
  type: string;

  // Stores input for this embeddable that is specific to this embeddable. Other parts of embeddable input
  // will be derived from the container's input. **Any state in here will override any state derived from
  // the container.**
  explicitInput: E;
}

export interface ContainerOutput extends EmbeddableOutput {
  embeddableLoaded: { [key: string]: boolean };
}

export interface ContainerInput extends EmbeddableInput {
  hidePanelTitles?: boolean;
  panels: {
    [key: string]: PanelState;
  };
}

export interface IContainer<
  I extends ContainerInput = ContainerInput,
  O extends ContainerOutput = ContainerOutput
> extends IEmbeddable<I, O> {
  readonly embeddableFactories: Map<string, EmbeddableFactory>;

  /**
   * Call if you want to wait until an embeddable with that id has finished loading.
   */
  untilEmbeddableLoaded<TEmbeddable extends IEmbeddable>(
    id: string
  ): Promise<TEmbeddable | ErrorEmbeddable>;

  /**
   * Returns the input for the given child. Uses a combination of explicit input
   * for the child stored on the parent and derived/inherited input taken from the
   * container itself.
   * @param id
   */
  getInputForChild<EEI extends EmbeddableInput>(id: string): EEI;

  /**
   * Changes the input for a given child. Note, this will override any inherited state taken from
   * the container itself.
   * @param id
   * @param changes
   */
  updateInputForChild<EEI extends EmbeddableInput>(id: string, changes: Partial<EEI>): void;

  /**
   * Returns the child embeddable with the given id.
   * @param id
   */
  getChild<E extends Embeddable<EmbeddableInput> = Embeddable<EmbeddableInput>>(id: string): E;

  /**
   * Removes the embeddable with the given id.
   * @param embeddableId
   */
  removeEmbeddable(embeddableId: string): void;

  /**
   * Adds a new embeddable that is backed off of a saved object.
   */
  addSavedObjectEmbeddable<
    EEI extends EmbeddableInput = EmbeddableInput,
    E extends Embeddable<EEI> = Embeddable<EEI>
  >(
    type: string,
    savedObjectId: string
  ): Promise<E | ErrorEmbeddable>;

  /**
   * Adds a new embeddable to the container. `explicitInput` may partially specify the required embeddable input,
   * but the remainder must come from inherited container state.
   */
  addNewEmbeddable<
    EEI extends EmbeddableInput = EmbeddableInput,
    EEO extends EmbeddableOutput = EmbeddableOutput,
    E extends Embeddable<EEI, EEO> = Embeddable<EEI, EEO>
  >(
    type: string,
    explicitInput: Partial<EEI>
  ): Promise<E | ErrorEmbeddable>;
}
