import type apm from 'elastic-apm-node';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { IExecutionContextContainer } from '@kbn/core-execution-context-server';
/**
 * @internal
 */
export interface IExecutionContext {
    getParentContextFrom(headers: Record<string, string | string[] | undefined>): KibanaExecutionContext | undefined;
    setRequestId(requestId: string): void;
    set(context: KibanaExecutionContext): void;
    /**
     * The sole purpose of this imperative internal API is to be used by the http service.
     * The event-based nature of Hapi server doesn't allow us to wrap a request handler with "withContext".
     * Since all the Hapi event lifecycle will lose the execution context.
     * Nodejs docs also recommend using AsyncLocalStorage.run() over AsyncLocalStorage.enterWith().
     * https://nodejs.org/api/async_context.html#async_context_asynclocalstorage_enterwith_store
     */
    get(): IExecutionContextContainer | undefined;
    withContext<R>(context: KibanaExecutionContext | undefined, fn: () => R): R;
    /**
     * returns serialized representation to send as a header
     **/
    getAsHeader(): string | undefined;
    /**
     * returns apm labels
     **/
    getAsLabels(): apm.Labels;
}
/**
 * @internal
 */
export type InternalExecutionContextSetup = IExecutionContext;
/**
 * @internal
 */
export type InternalExecutionContextStart = IExecutionContext;
export declare class ExecutionContextService implements CoreService<InternalExecutionContextSetup, InternalExecutionContextStart> {
    private readonly coreContext;
    private readonly log;
    private readonly contextStore;
    private readonly requestIdStore;
    private enabled;
    private configSubscription?;
    constructor(coreContext: CoreContext);
    setup(): InternalExecutionContextSetup;
    start(): InternalExecutionContextStart;
    stop(): void;
    private set;
    private withContext;
    private setRequestId;
    private get;
    private getAsHeader;
    private getAsLabels;
}
