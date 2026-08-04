import type { Dispatch, SetStateAction } from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { SaveDashboardReturn } from '../../dashboard_api/save_modal/types';
export declare const useDashboardMenuItems: ({ isLabsShown, setIsLabsShown, maybeRedirect, showResetChange, }: {
    isLabsShown: boolean;
    setIsLabsShown: Dispatch<SetStateAction<boolean>>;
    maybeRedirect: (result?: SaveDashboardReturn) => void;
    showResetChange?: boolean;
}) => {
    viewModeTopNavConfig: AppMenuConfig;
    editModeTopNavConfig: AppMenuConfig;
};
