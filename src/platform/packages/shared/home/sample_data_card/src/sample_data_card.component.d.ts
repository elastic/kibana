import React from 'react';
import type { SampleDataSet, InstalledStatus } from '@kbn/home-sample-data-types';
export interface Props {
    /** A Sample Data Set to display. */
    sampleDataSet: SampleDataSet;
    /** A resolved, themed image to display in the card. */
    imagePath: string;
    /** A handler to invoke when the status of a Sample Data Set is changed. */
    onStatusChange: (id: string, status: InstalledStatus) => void;
}
/**
 * A pure implementation of the `SampleDataCard` component that itself
 * does not depend on any Kibana services.  Still requires a
 * `SampleDataCardProvider` for its dependencies to render and function.
 */
export declare const SampleDataCard: ({ sampleDataSet, imagePath: image, onStatusChange: onAction, }: Props) => React.JSX.Element;
