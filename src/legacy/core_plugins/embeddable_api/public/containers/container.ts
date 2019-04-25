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

import uuid from 'uuid';
import {
  Embeddable,
  EmbeddableFactoryRegistry,
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  EmbeddableFactory,
} from '../embeddables';
import { ViewMode } from '../types';
import { IContainer } from './i_container';

export interface PanelState<E extends { [key: string]: unknown } = { [key: string]: unknown }> {
  savedObjectId?: string;

  embeddableId: string;
  // The type of embeddable in this panel. Will be used to find the factory in which to
  // load the embeddable.
  type: string;

  // Stores input for this embeddable that is specific to this embeddable. Other parts of embeddable input
  // will be derived from the container's input. Any state in here will override any state derived from
  // the container.
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

export abstract class Container<
  CEI extends Partial<EmbeddableInput> = {},
  I extends ContainerInput = ContainerInput,
  O extends ContainerOutput = ContainerOutput
> extends Embeddable<I, O> implements IContainer<I, O> {
  public readonly isContainer: boolean = true;
  protected readonly children: {
    [key: string]: Embeddable<any, any> | ErrorEmbeddable;
  } = {};
  public readonly embeddableFactories: EmbeddableFactoryRegistry;

  constructor(
    type: string,
    input: I,
    output: O,
    embeddableFactories: EmbeddableFactoryRegistry,
    parent?: Container
  ) {
    super(type, input, output, parent);
    this.embeddableFactories = embeddableFactories;
    this.initializeEmbeddables();
  }

  public updateInputForChild<EEI extends EmbeddableInput = EmbeddableInput>(
    id: string,
    changes: Partial<EEI>
  ) {
    if (!this.input.panels[id]) {
      throw new Error();
    }
    const panels = {
      panels: {
        ...this.input.panels,
        [id]: {
          ...this.input.panels[id],
          explicitInput: {
            ...this.input.panels[id].explicitInput,
            ...changes,
          },
        },
      },
    };
    this.updateInput(panels as Partial<I>);
  }

  public async addNewEmbeddable<
    EEI extends EmbeddableInput = EmbeddableInput,
    EEO extends EmbeddableOutput = EmbeddableOutput,
    E extends Embeddable<EEI, EEO> = Embeddable<EEI, EEO>
  >(type: string, explicitInput: Partial<EEI>): Promise<E | ErrorEmbeddable> {
    const factory = this.embeddableFactories.getFactoryByName(type) as EmbeddableFactory<
      EEI,
      any,
      E
    >;
    const panelState = this.createNewPanelState<EEI>(factory, explicitInput);
    this.setPanelState(panelState);
    const embeddable = await factory.create<CEI, I, O>(
      this.getInputForChild<EEI>(panelState.embeddableId),
      this
    );
    this.children[embeddable.id] = embeddable;
    this.updateOutput({
      ...this.output,
      embeddableLoaded: {
        [panelState.embeddableId]: true,
      },
    });
    return embeddable;
  }

  public async addSavedObjectEmbeddable<
    EEI extends EmbeddableInput = EmbeddableInput,
    E extends Embeddable<EEI> = Embeddable<EEI>
  >(type: string, savedObjectId: string): Promise<E | ErrorEmbeddable> {
    const factory = this.embeddableFactories.getFactoryByName(type) as EmbeddableFactory<
      EEI,
      any,
      E
    >;
    const panelState = this.createNewPanelState<EEI>(factory);
    panelState.savedObjectId = savedObjectId;
    this.setPanelState(panelState);
    const embeddable = await factory.createFromSavedObject(
      savedObjectId,
      this.getInputForChild<EEI>(panelState.embeddableId),
      this
    );
    this.children[embeddable.id] = embeddable;

    this.updateOutput({
      ...this.output,
      embeddableLoaded: {
        [panelState.embeddableId]: true,
      },
    });
    return embeddable;
  }

  public removeEmbeddable(embeddableId: string) {
    const embeddable = this.getChild(embeddableId);
    embeddable.destroy();
    delete this.children[embeddableId];

    const changedInput: { panels: { [key: string]: PanelState } } = {
      panels: {},
    };
    Object.values(this.input.panels).forEach(panel => {
      if (panel.embeddableId !== embeddableId) {
        changedInput.panels[panel.embeddableId] = panel;
      }
    });
    this.updateInput({ ...changedInput } as Partial<I>);
    this.updateOutput({
      embeddableLoaded: {
        ...this.output.embeddableLoaded,
        [embeddableId]: undefined,
      },
    } as Partial<O>);
  }

  public getChild<
    EI extends EmbeddableInput,
    EO extends EmbeddableOutput,
    E extends Embeddable<EI, EO> = Embeddable<EI, EO>
  >(id: string): E {
    return this.children[id] as E;
  }

  public getInputForChild<EEI extends EmbeddableInput = EmbeddableInput>(
    embeddableId: string
  ): EEI {
    const containerInput: CEI = this.getInheritedInput(embeddableId);
    const panelState = this.getPanelState(embeddableId);

    const explicitInput = panelState.explicitInput as { [key: string]: unknown };
    const explicitInputWithNoUndefinedParameters: { [key: string]: unknown } = {};

    Object.keys(panelState.explicitInput).forEach(key => {
      if (explicitInput[key] !== undefined) {
        explicitInputWithNoUndefinedParameters[key] = explicitInput[key];
      }
    });

    return ({
      ...containerInput,
      ...explicitInputWithNoUndefinedParameters,
      // Typescript has difficulties with inferring this type but it is accurate with all
      // tests I tried. Could probably be revisted with future releases of TS to see if
      // it can accurately infer the type.
    } as unknown) as EEI;
  }

  protected async loadEmbeddable<EEI extends EmbeddableInput = EmbeddableInput>(
    panelState: PanelState
  ) {
    if (this.input.panels[panelState.embeddableId] === undefined) {
      throw new Error(`Panel with id ${panelState.embeddableId} does not exist in this container`);
    }

    const factory = this.embeddableFactories.getFactoryByName<EEI>(panelState.type);

    const embeddable = panelState.savedObjectId
      ? await factory.createFromSavedObject(
          panelState.savedObjectId,
          this.getInputForChild<EEI>(panelState.embeddableId),
          this
        )
      : await factory.create(this.getInputForChild<EEI>(panelState.embeddableId), this);
    this.children[embeddable.id] = embeddable;
    this.updatePanelState(panelState);

    this.updateOutput({
      embeddableLoaded: {
        [panelState.embeddableId]: true,
      },
    } as Partial<O>);
  }

  protected createNewPanelState<EEI extends EmbeddableInput = EmbeddableInput>(
    factory: EmbeddableFactory<EEI>,
    partial: Partial<EEI> = {}
  ): PanelState {
    const embeddableId = partial.id || uuid.v4();

    const explicitInput = this.createNewExplicitEmbeddableInput<EEI>(
      embeddableId,
      factory,
      partial
    );

    return {
      type: factory.name,
      embeddableId,
      explicitInput: {
        id: embeddableId,
        ...explicitInput,
      },
    };
  }

  protected getPanelState<EI>(embeddableId: string) {
    if (this.input.panels[embeddableId] === undefined) {
      throw new Error(`No embeddable with id ${embeddableId}, this  ${JSON.stringify(this.input)}`);
    }
    const panelState: PanelState = this.input.panels[embeddableId];
    return panelState as PanelState<EI>;
  }

  protected abstract getInheritedInput(id: string): CEI;

  private async initializeEmbeddables() {
    const promises = Object.values(this.input.panels).map(async panel => {
      await this.loadEmbeddable<EmbeddableInput>(panel);
    });
    await Promise.all(promises);
  }

  private setPanelState(panelState: PanelState) {
    this.updateInput({
      panels: {
        ...this.input.panels,
        [panelState.embeddableId]: panelState,
      },
    } as Partial<I>);
  }

  private updatePanelState(panelState: PanelState) {
    this.updateInput({
      panels: {
        ...this.input.panels,
        [panelState.embeddableId]: {
          ...this.input.panels[panelState.embeddableId],
          ...panelState,
        },
      },
    } as Partial<I>);
  }

  private createNewExplicitEmbeddableInput<
    EEI extends EmbeddableInput = EmbeddableInput,
    E extends Embeddable<EEI> = Embeddable<EEI>
  >(id: string, factory: EmbeddableFactory<EEI, any, E>, partial: Partial<EEI> = {}) {
    const inheritedInput = this.getInheritedInput(id) as { [key: string]: unknown };
    const defaults = factory.getDefaultInputParameters() as { [key: string]: unknown };

    // Container input overrides defaults.
    const explicitInput: { [key: string]: unknown } = partial;
    Object.keys(defaults).forEach(key => {
      if (inheritedInput[key] === undefined && explicitInput[key] === undefined) {
        explicitInput[key] = defaults[key];
      }
    });
    return explicitInput;
  }
}
