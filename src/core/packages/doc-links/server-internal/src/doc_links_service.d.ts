import type { CoreContext } from '@kbn/core-base-server-internal';
import type { DocLinksServiceSetup, DocLinksServiceStart } from '@kbn/core-doc-links-server';
/** @internal */
export declare class DocLinksService {
    private readonly coreContext;
    private docLinks?;
    constructor(coreContext: CoreContext);
    setup(): DocLinksServiceSetup;
    start(): DocLinksServiceStart;
}
