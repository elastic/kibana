/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  IEmbeddable,
} from '../embeddables';
import { PanelState } from '../../../common/types';

export type { PanelState };

export interface ContainerOutput extends EmbeddableOutput {
  embeddableLoaded: { [key: string]: boolean };
}

export interface ContainerInput<PanelExplicitInput = {}> extends EmbeddableInput {
  hidePanelTitles?: boolean;
  panels: {
    [key: string]: PanelState<PanelExplicitInput & EmbeddableInput & { id: string }>;
  };
}

export interface EmbeddableContainerSettings {
  /**
   * If true, the container will wait for each embeddable to load after creation before loading the next embeddable.
   */
  initializeSequentially?: boolean;
  /**
   * Initialise children in the order specified. If an ID does not match it will be skipped and if a child is not included it will be initialized in the default order after the list of provided IDs.
   */
  childIdInitializeOrder?: string[];
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
   * Changes the input for a given child. Note, this will override all inherited state taken from
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
   * Embeddables which have deferEmbeddableLoad set to true need to manually call setChildLoaded
   * on their parent container to communicate when they have finished loading.
   * @param embeddable - the embeddable to set
   */
  setChildLoaded<E extends IEmbeddable = IEmbeddable>(embeddable: E): void;

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
