import type { EuiButtonProps, EuiBetaBadgeProps, IconType } from '@elastic/eui';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { SplitButtonProps } from '@kbn/split-button';
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export type TopNavMenuAction = (anchorElement: HTMLElement) => void;
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export interface TopNavMenuData {
    id?: string;
    htmlId?: string;
    label: string;
    run: TopNavMenuAction;
    description?: string;
    testId?: string;
    className?: string;
    disableButton?: boolean | (() => boolean);
    tooltip?: string | (() => string | undefined);
    tooltipTitle?: string;
    badge?: EuiBetaBadgeProps;
    emphasize?: boolean;
    fill?: boolean;
    color?: string;
    isLoading?: boolean;
    iconType?: IconType;
    iconSide?: EuiButtonProps['iconSide'];
    iconOnly?: boolean;
    target?: string;
    href?: string;
    intl?: InjectedIntl;
    splitButtonProps?: SplitButtonProps & {
        run: TopNavMenuAction;
    };
}
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export interface RegisteredTopNavMenuData extends TopNavMenuData {
    appName?: string;
}
