import { type ReactNode } from 'react';
import { type EuiCallOutProps } from '@elastic/eui';
export type KbnCalloutProps = Omit<EuiCallOutProps, 'color' | 'iconType' | 'title' | 'children' | 'actionProps'> & {
    title: ReactNode;
    /**
     * Use sparingly. Use `text` and `actionProps` instead where possible.
     */
    children?: ReactNode;
    /**
     * Props for primary and secondary actions within the toast.
     * Secondary actions can only be rendered in combination with a primary action.
     */
    actionProps?: {
        primary?: NonNullable<EuiCallOutProps['actionProps']>['primary'];
        secondary?: never;
    } | {
        primary: NonNullable<NonNullable<EuiCallOutProps['actionProps']>['primary']>;
        secondary?: NonNullable<EuiCallOutProps['actionProps']>['secondary'];
    };
};
