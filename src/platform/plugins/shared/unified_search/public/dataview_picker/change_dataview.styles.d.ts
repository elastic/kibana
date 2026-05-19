import type { EuiThemeComputed } from '@elastic/eui';
import type { DataViewListItemEnhanced } from './dataview_list';
export declare const changeDataViewStyles: ({ fullWidth, dataViewsList, theme, isMobile, }: {
    fullWidth?: boolean;
    dataViewsList: DataViewListItemEnhanced[];
    theme: EuiThemeComputed;
    isMobile: boolean;
}) => {
    trigger: {
        maxWidth: number | undefined;
    };
    popoverContent: {
        width: number;
    };
};
