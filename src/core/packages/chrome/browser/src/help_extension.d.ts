import type { EuiButtonEmptyProps, IconType } from '@elastic/eui';
/** @public */
export interface ChromeHelpExtension {
    /**
     * Provide your plugin's name to create a header for separation
     */
    appName: string;
    /**
     * Creates unified links for sending users to documentation or a custom link/button
     */
    links?: ChromeHelpExtensionMenuLink[];
}
/** @public */
export type ChromeHelpExtensionLinkBase = Pick<EuiButtonEmptyProps, 'target' | 'rel' | 'data-test-subj'> & {
    /**
     * @deprecated Extension items don't support icons. This property will be removed in a future release.
     */
    iconType?: IconType;
};
/** @public */
export interface ChromeHelpExtensionMenuDocumentationLink extends ChromeHelpExtensionLinkBase {
    /**
     * Creates a deep-link to app-specific documentation
     */
    linkType: 'documentation';
    /**
     * URL to documentation page.
     * i.e. `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/${appName}.html`,
     */
    href: string;
}
/** @public */
export interface ChromeHelpExtensionMenuCustomLink extends ChromeHelpExtensionLinkBase {
    /**
     * Extend EuiButtonEmpty to provide extra functionality
     */
    linkType: 'custom';
    /**
     * URL of the link. Omit when using `onClick` only.
     */
    href?: string;
    /**
     * Label of the button (in lieu of `children`)
     */
    content: string;
    /**
     * Opens link in new tab
     */
    external?: boolean;
    /**
     * Click handler. When provided without `href`, the link acts as a button.
     */
    onClick?: () => void;
}
/** @public */
export interface ChromeGlobalHelpExtensionMenuLink extends Omit<ChromeHelpExtensionMenuCustomLink, 'href'> {
    /**
     * URL of the link (required for global help links).
     */
    href: string;
    /**
     * Highest priority items are listed at the top of the list of links.
     */
    priority: number;
}
/** @public */
export type ChromeHelpExtensionMenuLink = ChromeHelpExtensionMenuDocumentationLink | ChromeHelpExtensionMenuCustomLink;
