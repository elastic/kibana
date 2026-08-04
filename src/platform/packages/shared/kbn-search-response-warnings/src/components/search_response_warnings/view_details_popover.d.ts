import React from 'react';
import type { EuiCallOutProps } from '@elastic/eui';
import type { SearchResponseWarning } from '../../types';
interface Props {
    displayAsLink?: boolean;
    warnings: SearchResponseWarning[];
}
export declare const ViewDetailsPopover: (props: Props) => React.JSX.Element | null;
export declare const useViewDetailsActionProps: (warnings: SearchResponseWarning[]) => NonNullable<EuiCallOutProps["actionProps"]>["primary"];
export {};
