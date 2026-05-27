import React from 'react';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * Props for the `DisabledFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name' | 'statusMsg'>;
/**
 * A footer for the `SampleDataCard` displayed when an unknown error or status prevents a person
 * from installing the Sample Data Set.
 */
export declare const DisabledFooter: ({ id, name, statusMsg }: Props) => React.JSX.Element;
