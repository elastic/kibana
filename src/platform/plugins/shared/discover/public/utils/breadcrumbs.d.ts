import type { DiscoverServices } from '../build_services';
/**
 * Helper function to set the Discover's breadcrumb
 * if there's an active savedSearch, its title is appended
 */
export declare function setBreadcrumbs({ rootBreadcrumbPath, titleBreadcrumbText, services, }: {
    rootBreadcrumbPath?: string;
    titleBreadcrumbText?: string;
    services: DiscoverServices;
}): void;
