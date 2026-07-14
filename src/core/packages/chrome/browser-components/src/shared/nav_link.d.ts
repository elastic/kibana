import type { EuiListGroupItemProps } from '@elastic/eui';
import React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '@kbn/core-chrome-browser';
export declare const isModifiedOrPrevented: (event: React.MouseEvent<HTMLElement, MouseEvent>) => boolean;
interface Props {
    link: ChromeNavLink;
    appId?: string;
    basePath?: HttpStart['basePath'];
    dataTestSubj?: string;
    onClick?: Function;
    navigateToUrl: ApplicationStart['navigateToUrl'];
    externalLink?: boolean;
    iconProps?: EuiListGroupItemProps['iconProps'];
}
export declare function createEuiListItem({ link, appId, basePath, onClick, navigateToUrl, dataTestSubj, externalLink, iconProps, }: Props): EuiListGroupItemProps;
export declare function createEuiButtonItem({ link, onClick, navigateToUrl, dataTestSubj, }: Omit<Props, 'appId' | 'basePath'>): {
    href: string;
    onClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): void;
    'data-test-subj': string;
};
export declare function createOverviewLink({ link, onClick, navigateToUrl, }: Omit<Props, 'appId' | 'basePath'>): {
    href: string;
    onClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): void;
    'data-test-subj': string;
};
export interface RecentNavLink {
    href: string;
    label: string;
    title: string;
    'aria-label': string;
    iconType?: string;
    onClick: React.MouseEventHandler;
}
/**
 * Add saved object type info to recently links
 * TODO #64541 - set return type to EuiListGroupItemProps
 *
 * Recent nav links are similar to normal nav links but are missing some Kibana Platform magic and
 * because of legacy reasons have slightly different properties.
 * @param recentLink
 * @param navLinks
 * @param basePath
 */
export declare function createRecentNavLink(recentLink: ChromeRecentlyAccessedHistoryItem, navLinks: ChromeNavLink[], basePath: HttpStart['basePath'], navigateToUrl: ApplicationStart['navigateToUrl']): RecentNavLink;
export {};
