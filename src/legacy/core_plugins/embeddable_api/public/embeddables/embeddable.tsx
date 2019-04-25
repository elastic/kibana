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
import { Adapters } from 'ui/inspector';
import * as Rx from 'rxjs';
import { trackUiMetric } from '../../../ui_metric/public';
import { IContainer } from '../containers';
import { IEmbeddable, EmbeddableInput, EmbeddableOutput } from './i_embeddable';
import { ViewMode } from '../types';

function getPanelTitle({
  inputTitle,
  defaultTitle,
  hidePanelTitles,
}: {
  inputTitle?: string;
  defaultTitle?: string;
  hidePanelTitles?: boolean;
}) {
  if (hidePanelTitles) {
    return '';
  }

  // Specificaly check for undefined, as an empty string override means "hide this title".
  return inputTitle === undefined ? defaultTitle : inputTitle;
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

  private destoyed: boolean = false;

  constructor(input: TEmbeddableInput, output: TEmbeddableOutput, parent?: IContainer) {
    this.id = input.id;
    this.output = {
      title: getPanelTitle({
        inputTitle: input.title,
        defaultTitle: output.defaultTitle,
        hidePanelTitles: input.hidePanelTitles,
      }),
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
        const newInput = parent.getInputForChild<TEmbeddableInput>(this.id);
        this.onResetInput(newInput);
      });
    }
  }

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

  public updateInput(changes: Partial<TEmbeddableInput>): void {
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

  public destroy(): void {
    trackUiMetric('EmbeddableAPI', `destroyed${this.type}`);

    this.destoyed = true;
    if (this.parentSubscription) {
      this.parentSubscription.unsubscribe();
    }
    return;
  }

  protected updateOutput(outputChanges: Partial<TEmbeddableOutput>): void {
    const newOutput = cloneDeep({
      ...this.output,
      ...outputChanges,
    });
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
        title: getPanelTitle({
          inputTitle: this.input.title,
          defaultTitle: this.output.defaultTitle,
          hidePanelTitles: this.input.hidePanelTitles,
        }),
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
