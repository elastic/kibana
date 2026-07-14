import type { ChromeGlobalHelpExtensionMenuLink, ChromeHelpExtension, ChromeHelpMenuLink, ChromeStyle } from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { EuiContextMenuPanelItemDescriptor, IconType } from '@elastic/eui';
interface HelpData {
    menuLinks: ChromeHelpMenuLink[];
    extension: ChromeHelpExtension | undefined;
    supportUrl: string;
    globalExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
    docLinks: DocLinksStart;
    feedbackHandler?: () => void;
    newsfeedHandler?: () => void;
    newsfeedHasNew?: boolean;
}
export interface HelpMenuLinkItem {
    name: string;
    key: string;
    icon?: IconType;
    href?: string;
    target?: string;
    rel?: string;
    onClick?: () => void;
    isExternal?: boolean;
    hasNewIndicator?: boolean;
    dataTestSubj?: string;
}
export interface HelpLinks {
    global: HelpMenuLinkItem[];
    default: HelpMenuLinkItem[];
    extension?: {
        label?: string;
        items: HelpMenuLinkItem[];
    };
}
export declare const toContextMenuItem: (options: HelpMenuLinkItem, navigateToUrl: (url: string) => Promise<void> | void, closeMenu: () => void) => EuiContextMenuPanelItemDescriptor;
export declare const buildDefaultContentLinks: ({ chromeStyle, docLinks, helpSupportUrl, feedbackHandler, newsfeedHandler, }: {
    chromeStyle: ChromeStyle;
    docLinks: DocLinksStart;
    helpSupportUrl: string;
    feedbackHandler?: () => void;
    newsfeedHandler?: () => void;
    newsfeedHasNew?: boolean;
}) => ChromeHelpMenuLink[];
export declare const buildHelpLinks: ({ chromeStyle, helpData, }: {
    chromeStyle: ChromeStyle;
    helpData: HelpData;
}) => HelpLinks;
export {};
