import type { AppDeepLinkLocations } from '@kbn/core/public';
import type { CreateManagementItemArgs } from '../types';
export declare class ManagementItem {
    readonly id: string;
    readonly title: string;
    readonly tip?: string;
    readonly order: number;
    readonly hideFromSidebar?: boolean;
    readonly hideFromGlobalSearch?: boolean;
    readonly visibleIn?: AppDeepLinkLocations[];
    readonly euiIconType?: string;
    readonly icon?: string;
    readonly capabilitiesId?: string;
    readonly redirectFrom?: string;
    enabled: boolean;
    constructor({ id, title, tip, order, hideFromSidebar, hideFromGlobalSearch, visibleIn, euiIconType, icon, capabilitiesId, redirectFrom, }: CreateManagementItemArgs);
    disable(): void;
    enable(): void;
}
