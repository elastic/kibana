import React from 'react';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import type { UseInstallParams } from '../hooks';
/**
 * Props for the `InstallFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name'> & UseInstallParams;
/**
 * A footer displayed when a Sample Data Set is not installed, allowing a person to install it.
 */
export declare const InstallFooter: (params: Props) => React.JSX.Element;
