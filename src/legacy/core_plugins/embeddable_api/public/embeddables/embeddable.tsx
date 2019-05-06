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
import { I18nProvider } from '@kbn/i18n/react';
import { isEqual } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { Adapters } from 'ui/inspector';
import * as Rx from 'rxjs';
import { IContainer } from '../containers';
import { EmbeddablePanel } from '../panel/embeddable_panel';
import { IEmbeddable, EmbeddableInput, EmbeddableOutput } from './i_embeddable';
import { ViewMode } from '../types';

export class Embeddable<
  TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
  TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput
> implements IEmbeddable<TEmbeddableInput, TEmbeddableOutput> {
  public readonly parent?: IContainer;
  public readonly isContainer: boolean = false;
  public readonly type: string;
  public readonly id: string;

  protected output: TEmbeddableOutput;
  protected input: TEmbeddableInput;

  private readonly input$: Rx.BehaviorSubject<TEmbeddableInput>;
  private readonly output$: Rx.BehaviorSubject<TEmbeddableOutput>;

  private panelContainer?: Element;
  private parentSubscription?: Rx.Subscription;
  private destoyed: boolean = false;

  constructor(
    type: string,
    input: TEmbeddableInput,
    output: TEmbeddableOutput,
    parent?: IContainer
  ) {
    this.type = type;
    this.id = input.id;
    this.output = output;
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
        if (!isEqual(this.input, newInput)) {
          this.input = { ...newInput };
          this.input$.next(this.input);
        }
      });
    }
  }

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
    return this.input.title || this.output.title;
  }

  public updateInput(changes: Partial<TEmbeddableInput>): void {
    if (this.destoyed) {
      throw new Error('Embeddable has been destroyed');
    }
    if (this.parent) {
      // Ensures state changes flow from container downward.
      this.parent.updateInputForChild<TEmbeddableInput>(this.id, changes);
    } else {
      const newInput = {
        ...this.input,
        ...changes,
      };
      if (!isEqual(this.input, newInput)) {
        this.input = newInput;
        Object.freeze(this.input);
        this.input$.next(this.input);
      }
    }
  }

  public renderInPanel(node: HTMLElement | Element) {
    if (this.destoyed) {
      throw new Error('Embeddable has been destroyed');
    }
    this.panelContainer = node;

    ReactDOM.render(
      <I18nProvider>
        <EmbeddablePanel embeddable={this} />
      </I18nProvider>,
      node
    );
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
    this.destoyed = true;
    if (this.panelContainer) {
      ReactDOM.unmountComponentAtNode(this.panelContainer);
    }
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
}
