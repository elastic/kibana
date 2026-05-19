import * as Rx from 'rxjs';
import { RenderCompleteDispatcher } from '@kbn/kibana-utils-plugin/public';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { EmbeddableError, EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
export declare abstract class Embeddable<TEmbeddableInput extends EmbeddableInput = EmbeddableInput, TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput, TNode = any> implements IEmbeddable<TEmbeddableInput, TEmbeddableOutput, TNode> {
    static runtimeId: number;
    readonly runtimeId: number;
    readonly deferEmbeddableLoad: boolean;
    catchError?(error: EmbeddableError, domNode: HTMLElement | Element): TNode | (() => void);
    abstract readonly type: string;
    readonly id: string;
    fatalError?: Error;
    protected output: TEmbeddableOutput;
    protected input: TEmbeddableInput;
    private readonly inputSubject;
    private readonly outputSubject;
    private readonly input$;
    private readonly output$;
    private readonly initializationFinished;
    protected renderComplete: RenderCompleteDispatcher;
    protected destroyed: boolean;
    constructor(input: TEmbeddableInput, output: TEmbeddableOutput);
    getEditHref(): Promise<string | undefined>;
    reportsEmbeddableLoad(): boolean;
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
    abstract reload(): void;
    /**
     * Merges input$ and output$ streams and debounces emit till next macro-task.
     * Could be useful to batch reactions to input$ and output$ updates that happen separately but synchronously.
     * In case corresponding state change triggered `reload` this stream is guarantied to emit later,
     * which allows to skip state handling in case `reload` already handled it.
     */
    getUpdated$(): Readonly<Rx.Observable<TEmbeddableInput | TEmbeddableOutput>>;
    getInput$(): Readonly<Rx.Observable<TEmbeddableInput>>;
    getOutput$(): Readonly<Rx.Observable<TEmbeddableOutput>>;
    getOutput(): Readonly<TEmbeddableOutput>;
    getExplicitInputIsEqual(lastExplicitInput: Partial<TEmbeddableInput>): Promise<boolean>;
    getExplicitInput(): Readonly<TEmbeddableInput>;
    getPersistableInput(): Readonly<TEmbeddableInput>;
    getInput(): Readonly<TEmbeddableInput>;
    getTitle(): string;
    getDescription(): string;
    updateInput(changes: Partial<TEmbeddableInput>): void;
    render(el: HTMLElement): TNode | void;
    /**
     * An embeddable can return inspector adapters if it want the inspector to be
     * available via the context menu of that panel.
     * @return Inspector adapters that will be used to open an inspector for.
     */
    getInspectorAdapters(): Adapters | undefined;
    /**
     * Called when this embeddable is no longer used, this should be the place for
     * implementors to add additional clean up tasks, like un-mounting and unsubscribing.
     */
    destroy(): void;
    untilInitializationFinished(): Promise<void>;
    /**
     * communicate to the parent embeddable that this embeddable's initialization is finished.
     * This only applies to embeddables which defer their loading state with deferEmbeddableLoad.
     */
    protected setInitializationFinished(): void;
    updateOutput(outputChanges: Partial<TEmbeddableOutput>): void;
    /**
     * Call this **only** when your embeddable has encountered a non-recoverable error; recoverable errors
     * should be handled by the individual embeddable types
     * @param e The fatal, unrecoverable Error that was thrown
     */
    protected onFatalError(e: Error): void;
    private onResetInput;
    private onInputChanged;
    supportedTriggers(): string[];
}
