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
import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { Adapters } from 'ui/inspector';
import { BehaviorSubject } from 'rxjs';
import * as Rx from 'rxjs';
import { Container } from '../containers';
import { EmbeddablePanel } from '../panel';
import { Trigger } from '../triggers';
import { OutputSpec, ViewMode } from '../types';
import { IEmbeddable } from './i_embeddable';

export interface EmbeddableInput {
  viewMode?: ViewMode;
  title?: string;
  id: string;
  savedObjectId?: string;
}

export interface EmbeddableOutput {
  editUrl?: string;
  title?: string;
  editable?: boolean;
}

export class Embeddable<
  I extends EmbeddableInput = EmbeddableInput,
  O extends EmbeddableOutput = EmbeddableOutput
> implements IEmbeddable<I, O> {
  public readonly parent?: Container;
  public readonly isContainer: boolean = false;
  public readonly type: string;
  public readonly id: string;

  protected output: O;
  protected input: I;

  private readonly input$: Rx.BehaviorSubject<I>;
  private readonly output$: Rx.BehaviorSubject<O>;

  private panelContainer?: Element;
  private parentSubscription?: Rx.Subscription;
  private destoyed: boolean = false;

  constructor(type: string, input: I, output: O, parent?: Container) {
    this.type = type;
    this.id = input.id;
    this.output = output;
    this.input = input;
    this.parent = parent;

    if (!input.id) {
      throw new Error('Id required');
    }

    if (parent) {
      this.parentSubscription = Rx.merge(parent.getInput$(), parent.getOutput$()).subscribe(() => {
        const newInput = parent.getInputForChild<I>(this.id);
        if (!isEqual(this.input, newInput)) {
          this.input = { ...newInput };
          this.input$.next(this.input);
        }
      });
    }

    this.input$ = new Rx.BehaviorSubject<I>(this.input);
    this.output$ = new Rx.BehaviorSubject<O>(this.output);
  }

  public getInput$(): Readonly<Rx.Observable<I>> {
    return this.input$.asObservable();
  }

  public getOutput$(): Readonly<Rx.Observable<O>> {
    return this.output$.asObservable();
  }

  public getOutput(): Readonly<O> {
    return this.output;
  }

  public getInput(): Readonly<I> {
    return this.input;
  }

  public getTitle() {
    return this.input.title || this.output.title;
  }

  public updateInput(changes: Partial<I>): void {
    if (this.destoyed) {
      throw new Error('Embeddable has been destroyed');
    }
    if (this.parent) {
      // Ensures state changes flow from container downward.
      this.parent.updateInputForChild<I>(this.id, changes);
    } else {
      const newInput = {
        ...this.input,
        ...changes,
      };
      if (!isEqual(this.input, newInput)) {
        this.input = newInput;
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

  protected updateOutput(outputChanges: Partial<O>): void {
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
