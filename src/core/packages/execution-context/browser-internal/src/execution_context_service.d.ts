import type { Observable } from 'rxjs';
import type { CoreService } from '@kbn/core-base-browser-internal';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ExecutionContextSetup, ExecutionContextStart } from '@kbn/core-execution-context-browser';
export type LabelValue = string | number | boolean;
export interface Labels {
    [key: string]: LabelValue;
}
export interface SetupDeps {
    analytics: AnalyticsServiceSetup;
}
export interface StartDeps {
    curApp$: Observable<string | undefined>;
}
/** @internal */
export declare class ExecutionContextService implements CoreService<ExecutionContextSetup, ExecutionContextStart> {
    private context$;
    private appId?;
    private subscription;
    private contract?;
    setup({ analytics }: SetupDeps): ExecutionContextSetup;
    start({ curApp$ }: StartDeps): ExecutionContextSetup;
    stop(): void;
    private removeUndefined;
    private getDefaultContext;
    private mergeContext;
    /**
     * Sets the analytics context provider based on the execution context details.
     * @param analytics The analytics service
     * @internal
     */
    private enrichAnalyticsContext;
}
