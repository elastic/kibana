import React from 'react';
export interface Props {
    eprPackageName: string;
}
/**
 * A data-connected component which can query about Beats-based replacement options for a given EPR module.
 */
export declare const ReplacementCard: ({ eprPackageName }: Props) => React.JSX.Element | null;
