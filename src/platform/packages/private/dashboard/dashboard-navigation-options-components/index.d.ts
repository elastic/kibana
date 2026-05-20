import React from 'react';
import type { DashboardNavigationOptions } from '@kbn/dashboard-navigation-options-schema';
export interface Props {
    options: DashboardNavigationOptions;
    onOptionChange: (newOptions: Partial<DashboardNavigationOptions>) => void;
}
export declare const DashboardNavigationOptionsEditor: ({ options, onOptionChange }: Props) => React.JSX.Element;
