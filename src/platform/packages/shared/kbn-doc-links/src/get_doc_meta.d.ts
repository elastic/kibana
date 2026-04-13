import type { DocLinksMeta, BuildFlavor } from './types';
export interface GetDocLinksMetaOptions {
    kibanaBranch: string;
    buildFlavor: BuildFlavor;
}
export declare const getDocLinksMeta: ({ kibanaBranch, buildFlavor, }: GetDocLinksMetaOptions) => DocLinksMeta;
