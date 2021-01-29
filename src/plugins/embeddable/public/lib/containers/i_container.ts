/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  IEmbeddable,
} from '../embeddables';
import { PanelState } from '../../../common/types';

export { PanelState };

export interface ContainerOutput extends EmbeddableOutput {
  embeddableLoaded: { [key: string]: boolean };
}

export interface ContainerInput<PanelExplicitInput = {}> extends EmbeddableInput {
  hidePanelTitles?: boolean;
  panels: {
    [key: string]: PanelState<PanelExplicitInput & EmbeddableInput & { id: string }>;
  };
}

export interface IContainer<
  Inherited extends {} = {},
  I extends ContainerInput<Inherited> = ContainerInput<Inherited>,
  O extends ContainerOutput = ContainerOutput
> extends IEmbeddable<I, O> {
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
