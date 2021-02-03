/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { cloneDeep, isEqual } from 'lodash';
import * as Rx from 'rxjs';
import { merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, mapTo, skip } from 'rxjs/operators';
import { RenderCompleteDispatcher } from '../../../../kibana_utils/public';
import { Adapters } from '../types';
import { IContainer } from '../containers';
import { EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { EmbeddableInput, ViewMode } from '../../../common/types';

function getPanelTitle(input: EmbeddableInput, output: EmbeddableOutput) {
  return input.hidePanelTitles ? '' : input.title === undefined ? output.defaultTitle : input.title;
}

export abstract class Embeddable<
  TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
  TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput
> implements IEmbeddable<TEmbeddableInput, TEmbeddableOutput> {
  static runtimeId: number = 0;

  public readonly runtimeId = Embeddable.runtimeId++;

  public readonly parent?: IContainer;
  public readonly isContainer: boolean = false;
  public abstract readonly type: string;
  public readonly id: string;
  public fatalError?: Error;

  protected output: TEmbeddableOutput;
  protected input: TEmbeddableInput;

  private readonly input$: Rx.BehaviorSubject<TEmbeddableInput>;
  private readonly output$: Rx.BehaviorSubject<TEmbeddableOutput>;

  protected renderComplete = new RenderCompleteDispatcher();

  // Listener to parent changes, if this embeddable exists in a parent, in order
  // to update input when the parent changes.
  private parentSubscription?: Rx.Subscription;

  private destroyed: boolean = false;

  constructor(input: TEmbeddableInput, output: TEmbeddableOutput, parent?: IContainer) {
    this.id = input.id;
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

    this.getOutput$()
      .pipe(
        map(({ title }) => title || ''),
        distinctUntilChanged()
      )
      .subscribe(
        (title) => {
          this.renderComplete.setTitle(title);
        },
        () => {}
      );
  }

  public getIsContainer(): this is IContainer {
    return this.isContainer === true;
  }

  /**
   * Reload will be called when there is a request to refresh the data or view, even if the
   * input data did not change.
   *
   * In case if input data did change and reload is requested input$ and output$ would still emit before `reload` is called
   *
   * The order would be as follows:
   * input$
   * output$
   * reload()
   * ----
   * updated$
   */
  public abstract reload(): void;

  /**
   * Merges input$ and output$ streams and debounces emit till next macro-task.
   * Could be useful to batch reactions to input$ and output$ updates that happen separately but synchronously.
   * In case corresponding state change triggered `reload` this stream is guarantied to emit later,
   * which allows to skip any state handling in case `reload` already handled it.
   */
  public getUpdated$(): Readonly<Rx.Observable<void>> {
    return merge(this.getInput$().pipe(skip(1)), this.getOutput$().pipe(skip(1))).pipe(
      debounceTime(0),
      mapTo(undefined)
    );
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

  public getTitle(): string {
    return this.output.title || '';
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
    if (this.destroyed) {
      throw new Error('Embeddable has been destroyed');
    }
    if (this.parent) {
      // Ensures state changes flow from container downward.
      this.parent.updateInputForChild<TEmbeddableInput>(this.id, changes);
    } else {
      this.onInputChanged(changes);
    }
  }

  public render(el: HTMLElement): void {
    this.renderComplete.setEl(el);
    this.renderComplete.setTitle(this.output.title || '');

    if (this.destroyed) {
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
    this.destroyed = true;

    this.input$.complete();
    this.output$.complete();

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

  protected onFatalError(e: Error) {
    this.fatalError = e;
    this.output$.error(e);
  }

  private onResetInput(newInput: TEmbeddableInput) {
    if (!isEqual(this.input, newInput)) {
      const oldLastReloadRequestTime = this.input.lastReloadRequestTime;
      this.input = newInput;
      this.input$.next(newInput);
      this.updateOutput({
        title: getPanelTitle(this.input, this.output),
      } as Partial<TEmbeddableOutput>);
      if (oldLastReloadRequestTime !== newInput.lastReloadRequestTime) {
        this.reload();
      }
    }
  }

  private onInputChanged(changes: Partial<TEmbeddableInput>) {
    const newInput = cloneDeep({
      ...this.input,
      ...changes,
    });

    this.onResetInput(newInput);
  }

  public supportedTriggers(): string[] {
    return [];
  }
}
