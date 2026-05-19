import type { CoreService } from '@kbn/core-base-browser-internal';
import type { IExternalUrl } from '@kbn/core-http-browser';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
interface SetupDeps {
    location: Pick<Location, 'href'>;
    injectedMetadata: InternalInjectedMetadataSetup;
}
export declare class ExternalUrlService implements CoreService<IExternalUrl> {
    setup({ injectedMetadata, location }: SetupDeps): IExternalUrl;
    start(): void;
    stop(): void;
}
export {};
