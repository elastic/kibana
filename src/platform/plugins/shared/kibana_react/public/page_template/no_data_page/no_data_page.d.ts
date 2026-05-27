import type { ReactNode, FunctionComponent, MouseEventHandler } from 'react';
import type { EuiCardProps, CommonProps } from '@elastic/eui';
export declare const NO_DATA_RECOMMENDED: string;
export type NoDataPageActions = Partial<EuiCardProps> & {
    /**
     * Applies the `Recommended` beta badge and makes the button `fill`
     */
    recommended?: boolean;
    /**
     * Provide just a string for the button's label, or a whole component
     */
    button?: string | ReactNode;
    /**
     * Remapping `onClick` to any element
     */
    onClick?: MouseEventHandler<HTMLElement>;
    /**
     * Category to auto-select within Fleet
     */
    category?: string;
};
export type NoDataPageActionsProps = Record<string, NoDataPageActions>;
export interface NoDataPageProps extends CommonProps {
    /**
     * Single name for the current solution, used to auto-generate the title, logo, description, and button label
     */
    solution: string;
    /**
     * Optionally replace the auto-generated logo
     */
    logo?: string;
    /**
     * Required to set the docs link for the whole solution
     */
    docsLink: string;
    /**
     * Optionally replace the auto-generated page title (h1)
     */
    pageTitle?: string;
    /**
     * An object of `NoDataPageActions` configurations with unique primary keys.
     * Use `elasticAgent` or `beats` as the primary key for pre-configured cards of this type.
     * Otherwise use a custom key that contains `EuiCard` props.
     */
    actions: NoDataPageActionsProps;
}
export declare const NoDataPage: FunctionComponent<NoDataPageProps>;
