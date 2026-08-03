import { type Action, type ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { DashboardApi } from '../../../dashboard_api/types';
import type { MenuItemGroup } from './types';
export declare const useMenuItemGroups: ({ dashboardApi, returnFocus, }: {
    dashboardApi: DashboardApi;
    returnFocus?: () => void;
}) => {
    groups: MenuItemGroup[] | undefined;
    loading: boolean;
    error: Error | undefined;
};
export declare function getMenuItems(actions: Action[], dashboardApi: DashboardApi, context: ActionExecutionContext): {
    id: string;
    name: string;
    icon: import("@elastic/eui/src/components/icon/icon").IconType;
    onClick: (event: React.MouseEvent) => void;
    'data-test-subj': string;
    description: string | undefined;
    isDisabled: boolean | undefined;
    order: number;
    MenuItem: import("react").ReactNode;
}[];
