import type { ReactElement } from 'react';
import React from 'react';
import type { EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';
export type HeaderBreadcrumbsBadgeProps = EuiBadgeProps & {
    badgeText: string;
    toolTipProps?: Partial<EuiToolTipProps>;
    renderCustomBadge?: (props: {
        badgeText: string;
    }) => ReactElement;
};
export declare const HeaderBreadcrumbsBadges: ({ badges, isFirst, }: {
    badges: HeaderBreadcrumbsBadgeProps[] | undefined;
    isFirst: boolean;
}) => React.JSX.Element | null;
