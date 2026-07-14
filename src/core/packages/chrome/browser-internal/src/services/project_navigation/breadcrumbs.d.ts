import type { ChromeProjectNavigationNode, ChromeSetProjectBreadcrumbsParams, ChromeBreadcrumb, CloudLinks } from '@kbn/core-chrome-browser';
export declare function buildBreadcrumbs({ kibanaName, cloudLinks, projectBreadcrumbs, activeNodes, chromeBreadcrumbs, isServerless, }: {
    kibanaName?: string;
    projectBreadcrumbs: {
        breadcrumbs: ChromeBreadcrumb[];
        params: ChromeSetProjectBreadcrumbsParams;
    };
    chromeBreadcrumbs: ChromeBreadcrumb[];
    cloudLinks: CloudLinks;
    activeNodes: ChromeProjectNavigationNode[][];
    isServerless: boolean;
}): ChromeBreadcrumb[];
