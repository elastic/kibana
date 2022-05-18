/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { isEqual, xor } from 'lodash';
import { merge, Subscription } from 'rxjs';
import { pairwise, take, delay } from 'rxjs/operators';

import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  EmbeddableFactory,
  IEmbeddable,
  isErrorEmbeddable,
} from '../embeddables';
import {
  IContainer,
  ContainerInput,
  ContainerOutput,
  PanelState,
  EmbeddableContainerSettings,
} from './i_container';
import { PanelNotFoundError, EmbeddableFactoryNotFoundError } from '../errors';
import { EmbeddableStart } from '../../plugin';
import { isSavedObjectEmbeddableInput } from '../../../common/lib/saved_object_embeddable';

const getKeys = <T extends {}>(o: T): Array<keyof T> => Object.keys(o) as Array<keyof T>;

export abstract class Container<
    TChildInput extends Partial<EmbeddableInput> = {},
    TContainerInput extends ContainerInput<TChildInput> = ContainerInput<TChildInput>,
    TContainerOutput extends ContainerOutput = ContainerOutput
  >
  extends Embeddable<TContainerInput, TContainerOutput>
  implements IContainer<TChildInput, TContainerInput, TContainerOutput>
{
  public readonly isContainer: boolean = true;
  public readonly children: {
    [key: string]: IEmbeddable<any, any> | ErrorEmbeddable;
  } = {};

  private subscription: Subscription | undefined;

  constructor(
    input: TContainerInput,
    output: TContainerOutput,
    protected readonly getFactory: EmbeddableStart['getEmbeddableFactory'],
    parent?: IContainer,
    settings?: EmbeddableContainerSettings
  ) {
    super(input, output, parent);
    this.getFactory = getFactory; // Currently required for using in storybook due to https://github.com/storybookjs/storybook/issues/13834

    // initialize all children on the first input change. Delayed so it is run after the constructor is finished.
    this.getInput$()
      .pipe(delay(0), take(1))
      .subscribe(() => {
        this.initializeChildEmbeddables(input, settings);
      });

    // on all subsequent input changes, diff and update children on changes.
    this.subscription = this.getInput$()
      // At each update event, get both the previous and current state.
      .pipe(pairwise())
      .subscribe(([{ panels: prevPanels }, { panels: currentPanels }]) => {
        this.maybeUpdateChildren(currentPanels, prevPanels);
      });
  }

  public setChildLoaded(embeddable: IEmbeddable) {
    // make sure the panel wasn't removed in the mean time, since the embeddable creation is async
    if (!this.input.panels[embeddable.id]) {
      embeddable.destroy();
      return;
    }

    this.children[embeddable.id] = embeddable;
    this.updateOutput({
      embeddableLoaded: {
        ...this.output.embeddableLoaded,
        [embeddable.id]: true,
      },
    } as Partial<TContainerOutput>);
  }

  public updateInputForChild<EEI extends EmbeddableInput = EmbeddableInput>(
    id: string,
    changes: Partial<EEI>
  ) {
    if (!this.input.panels[id]) {
      throw new PanelNotFoundError();
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
    this.updateInput(panels as Partial<TContainerInput>);
  }

  public reload() {
    Object.values(this.children).forEach((child) => child.reload());
  }

  public async addNewEmbeddable<
    EEI extends EmbeddableInput = EmbeddableInput,
    EEO extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<EEI, EEO> = IEmbeddable<EEI, EEO>
  >(type: string, explicitInput: Partial<EEI>): Promise<E | ErrorEmbeddable> {
    const factory = this.getFactory(type) as EmbeddableFactory<EEI, EEO, E> | undefined;

    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }

    const panelState = this.createNewPanelState<EEI, E>(factory, explicitInput);

    return this.createAndSaveEmbeddable(type, panelState);
  }

  public removeEmbeddable(embeddableId: string) {
    // Just a shortcut for removing the panel from input state, all internal state will get cleaned up naturally
    // by the listener.
    const panels = this.onRemoveEmbeddable(embeddableId);
    this.updateInput({ panels } as Partial<TContainerInput>);
  }

  /**
   * Control the panels that are pushed to the input stream when an embeddable is
   * removed. This can be used if removing one embeddable has knock-on effects, like
   * re-ordering embeddables that come after it.
   */
  protected onRemoveEmbeddable(embeddableId: string): ContainerInput['panels'] {
    const panels = { ...this.input.panels };
    delete panels[embeddableId];
    return panels;
  }

  public getChildIds(): string[] {
    return Object.keys(this.children);
  }

  public getChild<E extends IEmbeddable>(id: string): E {
    return this.children[id] as E;
  }

  public getInputForChild<TEmbeddableInput extends EmbeddableInput = EmbeddableInput>(
    embeddableId: string
  ): TEmbeddableInput {
    const containerInput: TChildInput = this.getInheritedInput(embeddableId);
    const panelState = this.getPanelState(embeddableId);

    const explicitInput = panelState.explicitInput;
    const explicitFiltered: { [key: string]: unknown } = {};

    const keys = getKeys(panelState.explicitInput);

    // If explicit input for a particular value is undefined, and container has that input defined,
    // we will use the inherited container input. This way children can set a value to undefined in order
    // to default back to inherited input. However, if the particular value is not part of the container, then
    // the caller may be trying to explicitly tell the child to clear out a given value, so in that case, we want
    // to pass it along.
    keys.forEach((key) => {
      if (explicitInput[key] === undefined && containerInput[key] !== undefined) {
        return;
      }
      explicitFiltered[key] = explicitInput[key];
    });

    return {
      ...containerInput,
      ...explicitFiltered,
      // Typescript has difficulties with inferring this type but it is accurate with all
      // tests I tried. Could probably be revisted with future releases of TS to see if
      // it can accurately infer the type.
    } as unknown as TEmbeddableInput;
  }

  public destroy() {
    super.destroy();
    Object.values(this.children).forEach((child) => child.destroy());
    this.subscription?.unsubscribe();
  }

  public async untilEmbeddableLoaded<TEmbeddable extends IEmbeddable>(
    id: string
  ): Promise<TEmbeddable | ErrorEmbeddable> {
    if (!this.input.panels[id]) {
      throw new PanelNotFoundError();
    }

    if (this.output.embeddableLoaded[id]) {
      return this.children[id] as TEmbeddable;
    }

    return new Promise<TEmbeddable>((resolve, reject) => {
      const subscription = merge(this.getOutput$(), this.getInput$()).subscribe(() => {
        if (this.output.embeddableLoaded[id]) {
          subscription.unsubscribe();
          resolve(this.children[id] as TEmbeddable);
        }

        // If we hit this, the panel was removed before the embeddable finished loading.
        if (this.input.panels[id] === undefined) {
          subscription.unsubscribe();
          // @ts-expect-error undefined in not assignable to TEmbeddable | ErrorEmbeddable
          resolve(undefined);
        }
      });
    });
  }

  public async getExplicitInputIsEqual(lastInput: TContainerInput) {
    const { panels: lastPanels, ...restOfLastInput } = lastInput;
    const { panels: currentPanels, ...restOfCurrentInput } = this.getInput();
    const otherInputIsEqual = isEqual(restOfLastInput, restOfCurrentInput);
    if (!otherInputIsEqual) return false;

    const embeddableIdsA = Object.keys(lastPanels);
    const embeddableIdsB = Object.keys(currentPanels);
    if (
      embeddableIdsA.length !== embeddableIdsB.length ||
      xor(embeddableIdsA, embeddableIdsB).length > 0
    ) {
      return false;
    }
    // embeddable ids are equal so let's compare individual panels.
    for (const id of embeddableIdsA) {
      const currentEmbeddable = await this.untilEmbeddableLoaded(id);
      const lastPanelInput = lastPanels[id].explicitInput;
      if (isErrorEmbeddable(currentEmbeddable)) continue;
      if (!(await currentEmbeddable.getExplicitInputIsEqual(lastPanelInput))) {
        return false;
      }
    }
    return true;
  }

  protected createNewPanelState<
    TEmbeddableInput extends EmbeddableInput,
    TEmbeddable extends IEmbeddable<TEmbeddableInput, any>
  >(
    factory: EmbeddableFactory<TEmbeddableInput, any, TEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): PanelState<TEmbeddableInput> {
    const embeddableId = partial.id || uuid.v4();

    const explicitInput = this.createNewExplicitEmbeddableInput<TEmbeddableInput>(
      embeddableId,
      factory,
      partial
    );

    return {
      type: factory.type,
      explicitInput: {
        ...explicitInput,
        id: embeddableId,
      } as TEmbeddableInput,
    };
  }

  protected getPanelState<TEmbeddableInput extends EmbeddableInput = EmbeddableInput>(
    embeddableId: string
  ) {
    if (this.input.panels[embeddableId] === undefined) {
      throw new PanelNotFoundError();
    }
    const panelState: PanelState = this.input.panels[embeddableId];
    return panelState as PanelState<TEmbeddableInput>;
  }

  /**
   * Return state that comes from the container and is passed down to the child. For instance, time range and
   * filters are common inherited input state. Note that state stored in `this.input.panels[embeddableId].explicitInput`
   * will override inherited input.
   */
  protected abstract getInheritedInput(id: string): TChildInput;

  private async initializeChildEmbeddables(
    initialInput: TContainerInput,
    initializeSettings?: EmbeddableContainerSettings
  ) {
    let initializeOrder = Object.keys(initialInput.panels);
    if (initializeSettings?.childIdInitializeOrder) {
      const initializeOrderSet = new Set<string>();
      for (const id of [...initializeSettings.childIdInitializeOrder, ...initializeOrder]) {
        if (!initializeOrderSet.has(id) && Boolean(this.getInput().panels[id])) {
          initializeOrderSet.add(id);
        }
      }
      initializeOrder = Array.from(initializeOrderSet);
    }

    for (const id of initializeOrder) {
      if (initializeSettings?.initializeSequentially) {
        const embeddable = await this.onPanelAdded(initialInput.panels[id]);
        if (embeddable && !isErrorEmbeddable(embeddable)) {
          await this.untilEmbeddableLoaded(id);
        }
      } else {
        this.onPanelAdded(initialInput.panels[id]);
      }
    }
  }

  private async createAndSaveEmbeddable<
    TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
    TEmbeddable extends IEmbeddable<TEmbeddableInput> = IEmbeddable<TEmbeddableInput>
  >(type: string, panelState: PanelState) {
    this.updateInput({
      panels: {
        ...this.input.panels,
        [panelState.explicitInput.id]: panelState,
      },
    } as Partial<TContainerInput>);

    return await this.untilEmbeddableLoaded<TEmbeddable>(panelState.explicitInput.id);
  }

  private createNewExplicitEmbeddableInput<
    TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
    TEmbeddable extends IEmbeddable<
      TEmbeddableInput,
      EmbeddableOutput
    > = IEmbeddable<TEmbeddableInput>
  >(
    id: string,
    factory: EmbeddableFactory<TEmbeddableInput, any, TEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): Partial<TEmbeddableInput> {
    const inheritedInput = this.getInheritedInput(id);
    const defaults = factory.getDefaultInput(partial);

    // Container input overrides defaults.
    const explicitInput: Partial<TEmbeddableInput> = partial;

    getKeys(defaults).forEach((key) => {
      // @ts-ignore We know this key might not exist on inheritedInput.
      const inheritedValue = inheritedInput[key];
      if (inheritedValue === undefined && explicitInput[key] === undefined) {
        explicitInput[key] = defaults[key];
      }
    });
    return explicitInput;
  }

  private onPanelRemoved(id: string) {
    // Clean up
    const embeddable = this.getChild(id);
    if (embeddable) {
      embeddable.destroy();

      // Remove references.
      delete this.children[id];
    }

    this.updateOutput({
      embeddableLoaded: {
        ...this.output.embeddableLoaded,
        [id]: undefined,
      },
    } as Partial<TContainerOutput>);
  }

  private async onPanelAdded(panel: PanelState) {
    this.updateOutput({
      embeddableLoaded: {
        ...this.output.embeddableLoaded,
        [panel.explicitInput.id]: false,
      },
    } as Partial<TContainerOutput>);
    let embeddable: IEmbeddable | ErrorEmbeddable | undefined;
    const inputForChild = this.getInputForChild(panel.explicitInput.id);
    try {
      const factory = this.getFactory(panel.type);
      if (!factory) {
        throw new EmbeddableFactoryNotFoundError(panel.type);
      }

      // TODO: lets get rid of this distinction with factories, I don't think it will be needed after this change.
      embeddable = isSavedObjectEmbeddableInput(inputForChild)
        ? await factory.createFromSavedObject(inputForChild.savedObjectId, inputForChild, this)
        : await factory.create(inputForChild, this);
    } catch (e) {
      embeddable = new ErrorEmbeddable(e, { id: panel.explicitInput.id }, this);
    }

    // EmbeddableFactory.create can return undefined without throwing an error, which indicates that an embeddable
    // can't be created.  This logic essentially only exists to support the current use case of
    // visualizations being created from the add panel, which redirects the user to the visualize app. Once we
    // switch over to inline creation we can probably clean this up, and force EmbeddableFactory.create to always
    // return an embeddable, or throw an error.
    if (embeddable) {
      if (!embeddable.deferEmbeddableLoad) {
        this.setChildLoaded(embeddable);
      }
    } else if (embeddable === undefined) {
      this.removeEmbeddable(panel.explicitInput.id);
    }
    return embeddable;
  }

  private panelHasChanged(currentPanel: PanelState, prevPanel: PanelState) {
    if (currentPanel.type !== prevPanel.type) {
      return true;
    }
  }

  private maybeUpdateChildren(
    currentPanels: TContainerInput['panels'],
    prevPanels: TContainerInput['panels']
  ) {
    const allIds = Object.keys({ ...currentPanels, ...this.output.embeddableLoaded });
    allIds.forEach((id) => {
      if (currentPanels[id] !== undefined && this.output.embeddableLoaded[id] === undefined) {
        return this.onPanelAdded(currentPanels[id]);
      }
      if (currentPanels[id] === undefined && this.output.embeddableLoaded[id] !== undefined) {
        return this.onPanelRemoved(id);
      }
      // In case of type change, remove and add a panel with the same id
      if (currentPanels[id] && prevPanels[id]) {
        if (this.panelHasChanged(currentPanels[id], prevPanels[id])) {
          this.onPanelRemoved(id);
          this.onPanelAdded(currentPanels[id]);
        }
      }
    });
  }
}
