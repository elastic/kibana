import type { EuiSideNavItemType } from '@elastic/eui';
import type { AppMountParameters } from '@kbn/core/public';
import type { ManagementSection } from '../../utils';
interface ManagementSidebarNavProps {
    sections: ManagementSection[];
    history: AppMountParameters['history'];
    selectedId: string;
}
/** @internal **/
export declare const managementSidebarNav: ({ selectedId, sections, history, }: ManagementSidebarNavProps) => EuiSideNavItemType<any>[];
export {};
