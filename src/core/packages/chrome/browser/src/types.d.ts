import type { ReactElement, ReactNode } from 'react';
import type { IconType, EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';
/** @public */
export interface ChromeBadge {
    text: string;
    tooltip: string;
    iconType?: IconType;
}
/** @public */
export type ChromeBreadcrumbsBadge = EuiBadgeProps & {
    badgeText: string;
    toolTipProps?: Partial<EuiToolTipProps>;
    renderCustomBadge?: (props: {
        badgeText: string;
    }) => ReactElement;
};
/**
 * @example
 * ```tsx
 * chrome.setHeaderBanner({ content: <MyBanner /> });
 * ```
 *
 * @public
 */
export interface ChromeUserBanner {
    content: ReactNode;
}
/** @public */
export type ChromeStyle = 'classic' | 'project';
