import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { IUserStorageClient } from '@kbn/core-user-storage-browser';
export interface UserStorageServiceDeps {
    http: InternalHttpSetup;
    injectedMetadata: InternalInjectedMetadataSetup;
}
/**
 * Browser core service that owns the lifecycle of the {@link IUserStorageClient}.
 *
 * @internal
 */
export declare class UserStorageService {
    private client?;
    private readonly done$;
    setup({ http, injectedMetadata }: UserStorageServiceDeps): IUserStorageClient;
    start(): IUserStorageClient;
    stop(): void;
}
