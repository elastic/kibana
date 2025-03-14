/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import * as Rx from 'rxjs';
import { merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, skip } from 'rxjs';
import { RenderCompleteDispatcher } from '@kbn/kibana-utils-plugin/public';
import { Adapters } from '@kbn/inspector-plugin/public';
import { EmbeddableError, EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { genericEmbeddableInputIsEqual, omitGenericEmbeddableInput } from './diff_embeddable_input';

function getPanelTitle(input: EmbeddableInput, output: EmbeddableOutput) {
  if (input.hidePanelTitles) return '';
  return input.title ?? output.defaultTitle;
}
function getPanelDescription(input: EmbeddableInput, output: EmbeddableOutput) {
  if (input.hidePanelTitles) return '';
  return input.description ?? output.defaultDescription;
}

export abstract class Embeddable<
  TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
  TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput,
  TNode = any
> implements IEmbeddable<TEmbeddableInput, TEmbeddableOutput, TNode>
{
  static runtimeId: number = 0;

  public readonly runtimeId = Embeddable.runtimeId++;

  public readonly deferEmbeddableLoad: boolean = false;
  public catchError?(error: EmbeddableError, domNode: HTMLElement | Element): TNode | (() => void);

  public abstract readonly type: string;
  public readonly id: string;
  public fatalError?: Error;

  protected output: TEmbeddableOutput;
  protected input: TEmbeddableInput;

  private readonly inputSubject = new Rx.ReplaySubject<TEmbeddableInput>(1);
  private readonly outputSubject = new Rx.ReplaySubject<TEmbeddableOutput>(1);
  private readonly input$ = this.inputSubject.asObservable();
  private readonly output$ = this.outputSubject.asObservable();

  private readonly initializationFinished = new Rx.Subject<void>();

  protected renderComplete = new RenderCompleteDispatcher();

  protected destroyed: boolean = false;

  constructor(input: TEmbeddableInput, output: TEmbeddableOutput) {
    this.id = input.id;

    this.output = {
      title: getPanelTitle(input, output),
      description: getPanelDescription(input, output),
      ...(this.reportsEmbeddableLoad()
        ? {}
        : {
            loading: false,
            rendered: true,
          }),
      ...output,
    };
    this.input = {
      viewMode: 'edit',
      ...input,
    };

    this.inputSubject.next(this.input);
    this.outputSubject.next(this.output);

    this.getOutput$()
      .pipe(
        map(({ title }) => title || ''),
        distinctUntilChanged()
      )
      .subscribe((title) => this.renderComplete.setTitle(title));

    setTimeout(() => {
      // after the constructor has finished, we initialize this embeddable if it isn't delayed
      if (!this.deferEmbeddableLoad) this.initializationFinished.complete();
    }, 0);
  }

  public async getEditHref(): Promise<string | undefined> {
    return this.getOutput().editUrl ?? undefined;
  }

  public reportsEmbeddableLoad() {
    return false;
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
   * which allows to skip state handling in case `reload` already handled it.
   */
  public getUpdated$(): Readonly<Rx.Observable<TEmbeddableInput | TEmbeddableOutput>> {
    return merge(this.getInput$().pipe(skip(1)), this.getOutput$().pipe(skip(1))).pipe(
      debounceTime(0)
    );
  }

  public getInput$(): Readonly<Rx.Observable<TEmbeddableInput>> {
    return this.input$;
  }

  public getOutput$(): Readonly<Rx.Observable<TEmbeddableOutput>> {
    return this.output$;
  }

  public getOutput(): Readonly<TEmbeddableOutput> {
    return this.output;
  }

  public async getExplicitInputIsEqual(
    lastExplicitInput: Partial<TEmbeddableInput>
  ): Promise<boolean> {
    const currentExplicitInput = this.getExplicitInput();
    return (
      genericEmbeddableInputIsEqual(lastExplicitInput, currentExplicitInput) &&
      fastIsEqual(
        omitGenericEmbeddableInput(lastExplicitInput),
        omitGenericEmbeddableInput(currentExplicitInput)
      )
    );
  }

  public getExplicitInput() {
    return this.getInput();
  }

  public getPersistableInput() {
    return this.getExplicitInput();
  }

  public getInput(): Readonly<TEmbeddableInput> {
    return this.input;
  }

  public getTitle(): string {
    return this.output.title ?? '';
  }

  public getDescription(): string {
    return this.output.description ?? '';
  }

  public updateInput(changes: Partial<TEmbeddableInput>): void {
    if (this.destroyed) {
      throw new Error('Embeddable has been destroyed');
    }
    this.onInputChanged(changes);
  }

  public render(el: HTMLElement): TNode | void {
    this.renderComplete.setEl(el);
    this.renderComplete.setTitle(this.output.title || '');

    if (this.destroyed) {
      throw new Error('Embeddable has been destroyed');
    }
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
   * implementors to add additional clean up tasks, like un-mounting and unsubscribing.
   */
  public destroy(): void {
    this.destroyed = true;

    this.inputSubject.complete();
    this.outputSubject.complete();

    return;
  }

  public async untilInitializationFinished(): Promise<void> {
    return new Promise((resolve) => {
      this.initializationFinished.subscribe({
        complete: () => {
          resolve();
        },
      });
    });
  }

  /**
   * communicate to the parent embeddable that this embeddable's initialization is finished.
   * This only applies to embeddables which defer their loading state with deferEmbeddableLoad.
   */
  protected setInitializationFinished() {
    if (!this.deferEmbeddableLoad) return;
    this.initializationFinished.complete();
  }

  public updateOutput(outputChanges: Partial<TEmbeddableOutput>): void {
    const newOutput = {
      ...this.output,
      ...outputChanges,
    };
    if (!fastIsEqual(this.output, newOutput)) {
      this.output = newOutput;
      this.outputSubject.next(this.output);
    }
  }

  /**
   * Call this **only** when your embeddable has encountered a non-recoverable error; recoverable errors
   * should be handled by the individual embeddable types
   * @param e The fatal, unrecoverable Error that was thrown
   */
  protected onFatalError(e: Error) {
    this.fatalError = e;
    this.outputSubject.error(e);
  }

  private onResetInput(newInput: TEmbeddableInput) {
    if (!fastIsEqual(this.input, newInput)) {
      const oldLastReloadRequestTime = this.input.lastReloadRequestTime;
      this.input = newInput;
      this.inputSubject.next(newInput);
      this.updateOutput({
        title: getPanelTitle(this.input, this.output),
        description: getPanelDescription(this.input, this.output),
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
