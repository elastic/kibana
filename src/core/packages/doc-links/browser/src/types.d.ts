import type { DocLinks } from '@kbn/doc-links';
/** @public */
export interface DocLinksStart {
    readonly DOC_LINK_VERSION: string;
    readonly ELASTIC_WEBSITE_URL: string;
    readonly links: DocLinks;
}
