import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { AppHeaderBack as CoreAppHeaderBack, AppHeaderBadge as CoreAppHeaderBadge, AppHeaderBadgeItem as CoreAppHeaderBadgeItem, AppHeaderConfig as CoreAppHeaderConfig, AppHeaderEditableTitle as CoreAppHeaderEditableTitle, AppHeaderMetadataButtonItem as CoreAppHeaderMetadataButtonItem, AppHeaderMetadataHealthItem as CoreAppHeaderMetadataHealthItem, AppHeaderMetadataItem as CoreAppHeaderMetadataItem, AppHeaderMetadataItems as CoreAppHeaderMetadataItems, AppHeaderMetadataTextItem as CoreAppHeaderMetadataTextItem, AppHeaderTab as CoreAppHeaderTab, AppHeaderTabAction as CoreAppHeaderTabAction, AppHeaderTabActions as CoreAppHeaderTabActions, AppHeaderTabBadge as CoreAppHeaderTabBadge, AppHeaderTabIconBadge as CoreAppHeaderTabIconBadge, AppHeaderTitle as CoreAppHeaderTitle, AppHeaderTitleSaveResult as CoreAppHeaderTitleSaveResult } from '@kbn/core-chrome-browser';
export type AppHeaderMenu = AppMenuConfig;
export type AppHeaderBack = CoreAppHeaderBack;
export type AppHeaderBadge = CoreAppHeaderBadge;
export type AppHeaderBadgeItem = CoreAppHeaderBadgeItem;
export type AppHeaderConfig = CoreAppHeaderConfig;
export type AppHeaderEditableTitle = CoreAppHeaderEditableTitle;
export type AppHeaderMetadataButtonItem = CoreAppHeaderMetadataButtonItem;
export type AppHeaderMetadataHealthItem = CoreAppHeaderMetadataHealthItem;
export type AppHeaderMetadataItem = CoreAppHeaderMetadataItem;
export type AppHeaderMetadataItems = CoreAppHeaderMetadataItems;
export type AppHeaderMetadataTextItem = CoreAppHeaderMetadataTextItem;
export type AppHeaderTab = CoreAppHeaderTab;
export type AppHeaderTabAction = CoreAppHeaderTabAction;
export type AppHeaderTabActions = CoreAppHeaderTabActions;
export type AppHeaderTabBadge = CoreAppHeaderTabBadge;
export type AppHeaderTabIconBadge = CoreAppHeaderTabIconBadge;
export type AppHeaderTitle = CoreAppHeaderTitle;
export type AppHeaderTitleSaveResult = CoreAppHeaderTitleSaveResult;
export type AppHeaderPadding = 'none' | 's' | 'm' | {
    /**
     * Set this to the SYMMETRIC padding of the surrounding section (e.g. an `EuiPageSection`'s
     * `paddingSize`). The header breaks out to that section's top/left/right edges via negative
     * margin so it spans full width and sits flush at the top, and its content is auto re-inset by
     * the same amount to stay aligned with the page gutter. `'m'` matches EUI `paddingSize: 'm'`
     * (16px); `'l'` matches EUI `paddingSize: 'l'` (24px). The header's internal vertical padding
     * is unaffected.
     */
    bleed: 'm' | 'l';
};
