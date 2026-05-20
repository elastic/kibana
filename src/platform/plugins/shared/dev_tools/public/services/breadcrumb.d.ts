import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
export type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];
export declare class BreadcrumbService {
    private setBreadcrumbsHandler?;
    setup(setBreadcrumbsHandler: SetBreadcrumbs): void;
    setBreadcrumbs(page: string): void;
}
