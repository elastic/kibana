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
import { EmbeddableAppContext } from '@kbn/presentation-publishing';
import { Adapters } from '../types';
import { IContainer } from '../containers';
import {
  EmbeddableError,
  EmbeddableOutput,
  IEmbeddable,
  LegacyEmbeddableAPI,
} from './i_embeddable';
import { EmbeddableInput, ViewMode } from '../../../common/types';
import { genericEmbeddableInputIsEqual, omitGenericEmbeddableInput } from './diff_embeddable_input';
import {
  CommonLegacyEmbeddable,
  legacyEmbeddableToApi,
} from './compatibility/legacy_embeddable_to_api';

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

  public readonly parent?: IContainer;
  public readonly isContainer: boolean = false;
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

  // Listener to parent changes, if this embeddable exists in a parent, in order
  // to update input when the parent changes.
  private parentSubscription?: Rx.Subscription;

  protected destroyed: boolean = false;

  constructor(input: TEmbeddableInput, output: TEmbeddableOutput, parent?: IContainer) {
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
      viewMode: ViewMode.EDIT,
      ...input,
    };
    this.parent = parent;

    this.inputSubject.next(this.input);
    this.outputSubject.next(this.output);

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
      .subscribe((title) => this.renderComplete.setTitle(title));

    const { api, destroyAPI } = legacyEmbeddableToApi(this as unknown as CommonLegacyEmbeddable);
    this.destroyAPI = destroyAPI;
    ({
      uuid: this.uuid,
      disableTriggers: this.disableTriggers,
      onEdit: this.onEdit,
      viewMode: this.viewMode,
      dataViews: this.dataViews,
      parentApi: this.parentApi,
      panelTitle: this.panelTitle,
      query$: this.query$,
      dataLoading: this.dataLoading,
      filters$: this.filters$,
      blockingError: this.blockingError,
      phase$: this.phase$,
      setPanelTitle: this.setPanelTitle,
      linkToLibrary: this.linkToLibrary,
      hidePanelTitle: this.hidePanelTitle,
      timeRange$: this.timeRange$,
      isEditingEnabled: this.isEditingEnabled,
      panelDescription: this.panelDescription,
      defaultPanelDescription: this.defaultPanelDescription,
      canLinkToLibrary: this.canLinkToLibrary,
      disabledActionIds: this.disabledActionIds,
      setDisabledActionIds: this.setDisabledActionIds,
      unlinkFromLibrary: this.unlinkFromLibrary,
      setHidePanelTitle: this.setHidePanelTitle,
      defaultPanelTitle: this.defaultPanelTitle,
      setTimeRange: this.setTimeRange,
      getTypeDisplayName: this.getTypeDisplayName,
      setPanelDescription: this.setPanelDescription,
      canUnlinkFromLibrary: this.canUnlinkFromLibrary,
      isCompatibleWithUnifiedSearch: this.isCompatibleWithUnifiedSearch,
      savedObjectId: this.savedObjectId,
    } = api);

    setTimeout(() => {
      // after the constructor has finished, we initialize this embeddable if it isn't delayed
      if (!this.deferEmbeddableLoad) this.initializationFinished.complete();
    }, 0);
  }

  /**
   * Assign compatibility API directly to the Embeddable instance.
   */
  private destroyAPI;
  public uuid: LegacyEmbeddableAPI['uuid'];
  public disableTriggers: LegacyEmbeddableAPI['disableTriggers'];
  public onEdit: LegacyEmbeddableAPI['onEdit'];
  public viewMode: LegacyEmbeddableAPI['viewMode'];
  public parentApi: LegacyEmbeddableAPI['parentApi'];
  public dataViews: LegacyEmbeddableAPI['dataViews'];
  public query$: LegacyEmbeddableAPI['query$'];
  public panelTitle: LegacyEmbeddableAPI['panelTitle'];
  public dataLoading: LegacyEmbeddableAPI['dataLoading'];
  public filters$: LegacyEmbeddableAPI['filters$'];
  public phase$: LegacyEmbeddableAPI['phase$'];
  public linkToLibrary: LegacyEmbeddableAPI['linkToLibrary'];
  public blockingError: LegacyEmbeddableAPI['blockingError'];
  public setPanelTitle: LegacyEmbeddableAPI['setPanelTitle'];
  public timeRange$: LegacyEmbeddableAPI['timeRange$'];
  public hidePanelTitle: LegacyEmbeddableAPI['hidePanelTitle'];
  public isEditingEnabled: LegacyEmbeddableAPI['isEditingEnabled'];
  public canLinkToLibrary: LegacyEmbeddableAPI['canLinkToLibrary'];
  public panelDescription: LegacyEmbeddableAPI['panelDescription'];
  public defaultPanelDescription: LegacyEmbeddableAPI['defaultPanelDescription'];
  public disabledActionIds: LegacyEmbeddableAPI['disabledActionIds'];
  public setDisabledActionIds: LegacyEmbeddableAPI['setDisabledActionIds'];
  public unlinkFromLibrary: LegacyEmbeddableAPI['unlinkFromLibrary'];
  public setTimeRange: LegacyEmbeddableAPI['setTimeRange'];
  public defaultPanelTitle: LegacyEmbeddableAPI['defaultPanelTitle'];
  public setHidePanelTitle: LegacyEmbeddableAPI['setHidePanelTitle'];
  public getTypeDisplayName: LegacyEmbeddableAPI['getTypeDisplayName'];
  public setPanelDescription: LegacyEmbeddableAPI['setPanelDescription'];
  public canUnlinkFromLibrary: LegacyEmbeddableAPI['canUnlinkFromLibrary'];
  public isCompatibleWithUnifiedSearch: LegacyEmbeddableAPI['isCompatibleWithUnifiedSearch'];
  public savedObjectId: LegacyEmbeddableAPI['savedObjectId'];

  public async getEditHref(): Promise<string | undefined> {
    return this.getOutput().editUrl ?? undefined;
  }

  public getAppContext(): EmbeddableAppContext | undefined {
    return this.parent?.getAppContext();
  }

  public reportsEmbeddableLoad() {
    return false;
  }

  public refreshInputFromParent() {
    if (!this.parent) return;
    // Make sure this panel hasn't been removed immediately after it was added, but before it finished loading.
    if (!this.parent.getInput().panels[this.id]) return;

    const newInput = this.parent.getInputForChild<TEmbeddableInput>(this.id);
    this.onResetInput(newInput);
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
    const root = this.getRoot();
    if (root?.getIsContainer?.()) {
      return (
        (root.getInput().panels?.[this.id]?.explicitInput as TEmbeddableInput) ?? this.getInput()
      );
    }
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
    this.destroyAPI();

    if (this.parentSubscription) {
      this.parentSubscription.unsubscribe();
    }
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
    if (this.deferEmbeddableLoad && this.parent?.isContainer) {
      this.parent.setChildLoaded(this);
    }
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
    // if the container is waiting for this embeddable to complete loading,
    // a fatal error counts as complete.
    if (this.deferEmbeddableLoad && this.parent?.isContainer) {
      this.parent.setChildLoaded(this);
    }
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
