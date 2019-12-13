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
import { isEqual, cloneDeep } from 'lodash';
import * as Rx from 'rxjs';
import { SearchCollectorFactory, SearchCollector } from 'src/plugins/data/public';
import { Adapters } from '../types';
import { IContainer } from '../containers';
import { IEmbeddable, EmbeddableInput, EmbeddableOutput } from './i_embeddable';
import { ViewMode } from '../types';

function getPanelTitle(input: EmbeddableInput, output: EmbeddableOutput) {
  return input.hidePanelTitles ? '' : input.title === undefined ? output.defaultTitle : input.title;
}

export interface EmbeddableHandlers {
  parent?: IContainer;
  createSearchCollector: SearchCollectorFactory;
  searchCollector?: SearchCollector;
}

export abstract class Embeddable<
  TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
  TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput
> implements IEmbeddable<TEmbeddableInput, TEmbeddableOutput> {
  public readonly parent?: IContainer;
  public readonly isContainer: boolean = false;
  public abstract readonly type: string;
  public readonly id: string;

  protected output: TEmbeddableOutput;
  protected input: TEmbeddableInput;

  private readonly input$: Rx.BehaviorSubject<TEmbeddableInput>;
  private readonly output$: Rx.BehaviorSubject<TEmbeddableOutput>;

  // Listener to parent changes, if this embeddable exists in a parent, in order
  // to update input when the parent changes.
  private parentSubscription?: Rx.Subscription;

  // TODO: Rename to destroyed.
  private destoyed: boolean = false;

  public searchCollector?: SearchCollector;

  constructor(
    input: TEmbeddableInput,
    output: TEmbeddableOutput,
    { createSearchCollector, parent, searchCollector }: EmbeddableHandlers
  ) {
    this.id = input.id;
    this.searchCollector =
      parent && parent.searchCollector ? parent.searchCollector : searchCollector;
    this.output = {
      title: getPanelTitle(input, output),
      ...output,
    };
    this.input = {
      viewMode: ViewMode.EDIT,
      ...input,
    };
    this.parent = parent;

    this.input$ = new Rx.BehaviorSubject<TEmbeddableInput>(this.input);
    this.output$ = new Rx.BehaviorSubject<TEmbeddableOutput>(this.output);

    if (parent) {
      this.parentSubscription = Rx.merge(parent.getInput$(), parent.getOutput$()).subscribe(() => {
        // Make sure this panel hasn't been removed immediately after it was added, but before it finished loading.
        if (!parent.getInput().panels[this.id]) return;

        const newInput = parent.getInputForChild<TEmbeddableInput>(this.id);
        this.onResetInput(newInput);
      });
    }
  }

  public getIsContainer(): this is IContainer {
    return this.isContainer === true;
  }

  /**
   * Reload will be called when there is a request to refresh the data or view, even if the
   * input data did not change.
   */
  public abstract reload(): void;

  public getInput$(): Readonly<Rx.Observable<TEmbeddableInput>> {
    return this.input$.asObservable();
  }

  public getOutput$(): Readonly<Rx.Observable<TEmbeddableOutput>> {
    return this.output$.asObservable();
  }

  public getOutput(): Readonly<TEmbeddableOutput> {
    return this.output;
  }

  public getInput(): Readonly<TEmbeddableInput> {
    return this.input;
  }

  public getTitle() {
    return this.output.title;
  }

  /**
   * Returns the top most parent embeddable, or itself if this embeddable
   * is not within a parent.
   */
  public getRoot(): IEmbeddable | IContainer {
    let root: IEmbeddable | IContainer = this;
    while (root.parent) {
      root = root.parent;
    }
    return root;
  }

  public updateInput(changes: Partial<TEmbeddableInput>): void {
    let changesFound = false;
    Object.keys(changes).forEach(key => {
      if (!_.isEqual(this.input[key], changes[key])) {
        changesFound = true;
      }
    });
    if (!changesFound) return;

    if (this.destoyed) {
      throw new Error('Embeddable has been destroyed');
    }
    if (this.parent) {
      // Ensures state changes flow from container downward.
      this.parent.updateInputForChild<TEmbeddableInput>(this.id, changes);
    } else {
      this.onInputChanged(changes);
    }
  }

  public render(domNode: HTMLElement | Element): void {
    if (this.destoyed) {
      throw new Error('Embeddable has been destroyed');
    }
    return;
  }

  /**
   * An embeddable can return inspector adapters if it want the inspector to be
   * available via the context menu of that panel.
   * @return Inspector adapters that will be used to open an inspector for.
   */
  public getInspectorAdapters(): Adapters | undefined {
    return undefined;
  }

  /**
   * Called when this embeddable is no longer used, this should be the place for
   * implementors to add any additional clean up tasks, like unmounting and unsubscribing.
   */
  public destroy(): void {
    this.destoyed = true;
    if (this.parentSubscription) {
      this.parentSubscription.unsubscribe();
    }
    return;
  }

  protected updateOutput(outputChanges: Partial<TEmbeddableOutput>): void {
    const newOutput = {
      ...this.output,
      ...outputChanges,
    };
    if (!isEqual(this.output, newOutput)) {
      this.output = newOutput;
      this.output$.next(this.output);
    }
  }

  private onResetInput(newInput: TEmbeddableInput) {
    if (!isEqual(this.input, newInput)) {
      if (this.input.lastReloadRequestTime !== newInput.lastReloadRequestTime) {
        this.reload();
      }
      this.input = newInput;
      this.input$.next(newInput);
      this.updateOutput({
        title: getPanelTitle(this.input, this.output),
      } as Partial<TEmbeddableOutput>);
    }
  }

  private onInputChanged(changes: Partial<TEmbeddableInput>) {
    const newInput = cloneDeep({
      ...this.input,
      ...changes,
    });

    this.onResetInput(newInput);
  }
}
