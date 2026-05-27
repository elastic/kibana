import React from 'react';
import type { SampleDataSet, InstalledStatus } from '@kbn/home-sample-data-types';
/**
 * Props for the `Footer` component.
 */
export interface Props {
    /** The Sample Data Set and its status. */
    sampleDataSet: SampleDataSet;
    /** The handler to invoke when an action is performed upon the Sample Data Set. */
    onAction: (id: string, status: InstalledStatus) => void;
}
/**
 * Displays the appropriate Footer component based on the status of the Sample Data Set.
 */
export declare const Footer: ({ sampleDataSet, onAction }: Props) => React.JSX.Element;
