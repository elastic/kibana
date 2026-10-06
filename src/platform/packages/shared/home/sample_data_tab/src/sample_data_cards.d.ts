import React from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
/**
 * Props for the `SampleDataCards` component.
 */
export interface Props {
    /** Number of columns, defaults to 3. */
    columns?: EuiFlexGridProps['columns'];
}
/**
 * Fetches and displays a collection of Sample Data Sets in a grid.
 */
export declare const SampleDataCards: ({ columns }: Props) => React.JSX.Element;
