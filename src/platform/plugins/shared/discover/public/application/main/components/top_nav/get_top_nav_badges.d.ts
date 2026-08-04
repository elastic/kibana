import type { ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import type { DiscoverServices } from '../../../../build_services';
/**
 * Helper function to build the top nav badges
 */
export declare const getTopNavBadges: ({ isMobile, isManaged, services, }: {
    isMobile: boolean;
    isManaged: boolean;
    services: DiscoverServices;
}) => ChromeBreadcrumbsBadge[];
