import React from 'react';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import type { Props as ComponentProps } from './sample_data_card.component';
/**
 * Props for the `SampleDataCard` component.
 */
export interface Props extends Pick<ComponentProps, 'onStatusChange'> {
    /** A Sample Data Set to display. */
    sampleDataSet: SampleDataSet;
}
/**
 * A card representing a Sample Data Set that can be installed.  Uses Kibana services to
 * display and install the data set.  Requires a `SampleDataCardProvider` to render and
 * function.
 */
export declare const SampleDataCard: ({ sampleDataSet, onStatusChange }: Props) => React.JSX.Element;
