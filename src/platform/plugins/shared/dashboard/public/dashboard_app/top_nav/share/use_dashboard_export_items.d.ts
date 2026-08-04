import type { AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import type { useShareOptions } from './use_share_options';
export declare const useDashboardExportItems: (shareOptions: ReturnType<typeof useShareOptions>) => AppMenuPopoverItem[];
export declare const getExportItemMeta: (integrationId: string) => {
    label: string;
    testId: string;
    iconType: string;
    order: number;
    separator?: undefined;
} | {
    label: string;
    testId: string;
    iconType: string;
    order: number;
    separator: "above";
} | {
    label: string;
    iconType: undefined;
    testId: string;
    order: number;
    separator?: undefined;
};
