import type { CoreService } from '@kbn/core-base-browser-internal';
import type { ExecutionContextSetup } from '@kbn/core-execution-context-browser';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import type { InternalHttpSetup, InternalHttpStart } from './types';
interface HttpDeps {
    injectedMetadata: InternalInjectedMetadataSetup;
    fatalErrors: FatalErrorsSetup;
    executionContext: ExecutionContextSetup;
}
/** @internal */
export declare class HttpService implements CoreService<InternalHttpSetup, InternalHttpStart> {
    private readonly anonymousPaths;
    private readonly loadingCount;
    private service?;
    setup({ injectedMetadata, fatalErrors, executionContext }: HttpDeps): InternalHttpSetup;
    start(): InternalHttpSetup;
    stop(): void;
}
export {};
