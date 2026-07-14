import type { DocLinks, BuildFlavor } from './types';
export interface GetDocLinkOptions {
    kibanaBranch: string;
    buildFlavor: BuildFlavor;
}
export declare const getDocLinks: ({ kibanaBranch, buildFlavor }: GetDocLinkOptions) => DocLinks;
