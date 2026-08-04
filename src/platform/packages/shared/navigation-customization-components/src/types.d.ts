import type { IconType } from '@elastic/eui';
export interface NavigationItemInfo {
    id: string;
    title: string;
    hidden: boolean;
    icon?: IconType;
}
