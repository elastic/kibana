import React from 'react';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import type { UseRemoveParams } from '../hooks';
import type { Props as ViewButtonProps } from './view_button';
/**
 * Props for the `RemoveFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name'> & UseRemoveParams & ViewButtonProps;
/**
 * A footer displayed when a Sample Data Set is installed, allowing a person to remove it or view
 * saved objects associated with it in their related solutions.
 */
export declare const RemoveFooter: (props: Props) => React.JSX.Element;
