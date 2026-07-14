import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
/** @internal */
export interface DocLinksServiceStartDeps {
    injectedMetadata: InternalInjectedMetadataSetup;
}
/** @internal */
export declare class DocLinksService {
    private readonly coreContext;
    constructor(coreContext: CoreContext);
    setup(): void;
    start({ injectedMetadata }: DocLinksServiceStartDeps): DocLinksStart;
}
