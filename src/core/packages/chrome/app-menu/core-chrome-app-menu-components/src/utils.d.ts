import { type EuiButtonColor, type EuiThemeComputed, type EuiContextMenuPanelDescriptor, type EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { AppMenuConfig, AppMenuItemCommon, AppMenuItemType, AppMenuPopoverItem, AppMenuPrimaryActionItem, AppMenuSwitch } from './types';
/**
 * Calculate how many items can be displayed.
 * When overflow is needed, one slot is reserved for the overflow button.
 *
 * @param hasStaticItems - Whether there are static items that will be appended to the overflow menu.
 *   When true, the overflow button is always shown, so a slot must be reserved for it.
 */
export declare const getDisplayedItemsAllowedAmount: (config: AppMenuConfig, hasStaticItems?: boolean) => number;
/**
 * Determine if the menu should overflow into a "more" menu.
 */
export declare const getShouldOverflow: ({ config, displayedItemsAllowedAmount, }: {
    config: AppMenuConfig;
    displayedItemsAllowedAmount: number;
}) => boolean;
/**
 * Split the items into displayed and overflow based on the configuration.
 */
export declare const getAppMenuItems: ({ config, hasStaticItems, }: {
    config?: AppMenuConfig;
    hasStaticItems?: boolean;
}) => {
    displayedItems: AppMenuItemType[];
    overflowItems: AppMenuItemType[];
    shouldOverflow: boolean;
};
export declare const processStaticItems: (staticItems?: AppMenuItemType[]) => AppMenuItemType[];
export declare const hasNonGlobalStaticItems: (staticItems?: Array<{
    global?: boolean;
}>) => boolean;
export declare const isDisabled: (disableButton: AppMenuItemCommon["disableButton"]) => boolean;
export declare const getTooltip: ({ tooltipContent, tooltipTitle, }: {
    tooltipContent?: AppMenuItemCommon["tooltipContent"];
    tooltipTitle?: AppMenuItemCommon["tooltipTitle"];
}) => {
    title: string | undefined;
    content: string | undefined;
};
export declare const createReturnFocus: (triggerElement: HTMLElement, parentElement?: HTMLElement) => () => void;
export declare const mapAppMenuItemToPanelItem: (item: AppMenuPopoverItem, childPanelId?: number, onClose?: () => void, onCloseOverflowButton?: () => void, anchorDomElement?: HTMLElement) => EuiContextMenuPanelItemDescriptor;
/**
 * Generate action items for the popover menu. This is only used below "m" breakpoint.
 */
export declare const getPopoverActionItems: ({ primaryActionItem, onCloseOverflowButton, }: {
    primaryActionItem?: AppMenuPrimaryActionItem;
    onCloseOverflowButton?: () => void;
}) => EuiContextMenuPanelItemDescriptor[];
/**
 * Generate switch items for the popover menu. The switch is rendered as the very last item
 * with a separator above it.
 */
export declare const getPopoverSwitchItems: ({ switchConfig, }: {
    switchConfig: AppMenuSwitch;
}) => EuiContextMenuPanelItemDescriptor[];
/**
 * Recursively generate EUI context menu panels from the provided menu items.
 */
export declare const getPopoverPanels: ({ items, staticItems, primaryActionItem, switchConfig, startPanelId, rootPanelWidth, rootPopoverTestId, onClose, onCloseOverflowButton, anchorDomElement, }: {
    items: AppMenuPopoverItem[];
    staticItems?: AppMenuPopoverItem[];
    primaryActionItem?: AppMenuPrimaryActionItem;
    switchConfig?: AppMenuSwitch;
    startPanelId?: number;
    rootPanelWidth?: number;
    rootPopoverTestId?: string;
    onClose?: () => void;
    onCloseOverflowButton?: () => void;
    anchorDomElement?: HTMLElement;
}) => EuiContextMenuPanelDescriptor[];
/**
 * Get the background color for a button associated when popover is open.
 */
export declare const getIsSelectedColor: ({ color, euiTheme, isFilled, }: {
    color: EuiButtonColor;
    euiTheme: EuiThemeComputed;
    isFilled: boolean;
}) => string | {
    backgroundPrimary: string;
    backgroundAccent: string;
    backgroundAccentSecondary: string;
    backgroundNeutral: string;
    backgroundSuccess: string;
    backgroundWarning: string;
    backgroundRisk: string;
    backgroundDanger: string;
    backgroundText: string;
    backgroundDisabled: string;
    backgroundPrimaryHover: string;
    backgroundAccentHover: string;
    backgroundAccentSecondaryHover: string;
    backgroundNeutralHover: string;
    backgroundSuccessHover: string;
    backgroundWarningHover: string;
    backgroundRiskHover: string;
    backgroundDangerHover: string;
    backgroundAssistanceHover: string;
    backgroundTextHover: string;
    backgroundPrimaryActive: string;
    backgroundAccentActive: string;
    backgroundAccentSecondaryActive: string;
    backgroundNeutralActive: string;
    backgroundSuccessActive: string;
    backgroundWarningActive: string;
    backgroundRiskActive: string;
    backgroundDangerActive: string;
    backgroundTextActive: string;
    backgroundFilledPrimary: string;
    backgroundFilledAccent: string;
    backgroundFilledAccentSecondary: string;
    backgroundFilledNeutral: string;
    backgroundFilledSuccess: string;
    backgroundFilledWarning: string;
    backgroundFilledRisk: string;
    backgroundFilledDanger: string;
    backgroundFilledText: string;
    backgroundFilledDisabled: string;
    backgroundFilledPrimaryHover: string;
    backgroundFilledAccentHover: string;
    backgroundFilledAccentSecondaryHover: string;
    backgroundFilledNeutralHover: string;
    backgroundFilledSuccessHover: string;
    backgroundFilledWarningHover: string;
    backgroundFilledRiskHover: string;
    backgroundFilledDangerHover: string;
    backgroundFilledAssistanceHover: string;
    backgroundFilledTextHover: string;
    backgroundFilledPrimaryActive: string;
    backgroundFilledAccentActive: string;
    backgroundFilledAccentSecondaryActive: string;
    backgroundFilledNeutralActive: string;
    backgroundFilledSuccessActive: string;
    backgroundFilledWarningActive: string;
    backgroundFilledRiskActive: string;
    backgroundFilledDangerActive: string;
    backgroundFilledTextActive: string;
    backgroundEmptyPrimaryHover: string;
    backgroundEmptyAccentHover: string;
    backgroundEmptyAccentSecondaryHover: string;
    backgroundEmptyNeutralHover: string;
    backgroundEmptySuccessHover: string;
    backgroundEmptyWarningHover: string;
    backgroundEmptyRiskHover: string;
    backgroundEmptyDangerHover: string;
    backgroundEmptyTextHover: string;
    backgroundEmptyPrimaryActive: string;
    backgroundEmptyAccentActive: string;
    backgroundEmptyAccentSecondaryActive: string;
    backgroundEmptyNeutralActive: string;
    backgroundEmptySuccessActive: string;
    backgroundEmptyWarningActive: string;
    backgroundEmptyRiskActive: string;
    backgroundEmptyDangerActive: string;
    backgroundEmptyTextActive: string;
    textColorPrimary: string;
    textColorAccent: string;
    textColorAccentSecondary: string;
    textColorNeutral: string;
    textColorSuccess: string;
    textColorWarning: string;
    textColorRisk: string;
    textColorDanger: string;
    textColorText: string;
    textColorDisabled: string;
    textColorFilledPrimary: string;
    textColorFilledAccent: string;
    textColorFilledAccentSecondary: string;
    textColorFilledNeutral: string;
    textColorFilledSuccess: string;
    textColorFilledWarning: string;
    textColorFilledRisk: string;
    textColorFilledDanger: string;
    textColorFilledText: string;
    textColorFilledDisabled: string;
};
