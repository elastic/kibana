import type { ReactElement } from 'react';
import React from 'react';
import type { EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';
/**
 * @deprecated Use coreStart.chrome.setBreadcrumbsBadges API instead
 */
export type TopNavMenuBadgeProps = EuiBadgeProps & {
    badgeText: string;
    toolTipProps?: Partial<EuiToolTipProps>;
    renderCustomBadge?: (props: {
        badgeText: string;
    }) => ReactElement;
};
/**
 * @deprecated Use coreStart.chrome.setBreadcrumbsBadges API instead
 */
export declare const TopNavMenuBadges: ({ badges }: {
    badges: TopNavMenuBadgeProps[] | undefined;
}) => React.JSX.Element | null;
