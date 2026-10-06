import React from 'react';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * Props for the `ViewButton` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name' | 'overviewDashboard' | 'appLinks'>;
/**
 * A button displayed when a Sample Data Set is installed, allowing a person to view the overview dashboard,
 * and, if included, a number of actions to navigate to other solutions.
 */
export declare const ViewButton: ({ id, name, overviewDashboard, appLinks }: Props) => React.JSX.Element;
