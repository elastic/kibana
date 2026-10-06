import type { DocLinks } from '@kbn/doc-links';
/** @public */
export interface DocLinksServiceSetup {
    /** The branch/version the docLinks are pointing to */
    readonly version: string;
    /** The base url for the elastic website */
    readonly elasticWebsiteUrl: string;
    /** A record of all registered doc links */
    readonly links: DocLinks;
}
/** @public */
export type DocLinksServiceStart = DocLinksServiceSetup;
/** @public */
export type DocLinksServicePreboot = DocLinksServiceSetup;
