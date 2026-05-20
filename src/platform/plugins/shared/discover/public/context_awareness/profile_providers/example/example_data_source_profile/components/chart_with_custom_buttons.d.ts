import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import React from 'react';
import type { ChartSectionConfigurationExtensionParams } from '../../../../types';
interface ChartWithCustomButtonsProps extends ChartSectionProps {
    actions: ChartSectionConfigurationExtensionParams['actions'];
}
export declare const ChartWithCustomButtons: ({ actions, ...props }: ChartWithCustomButtonsProps) => React.JSX.Element | null;
export {};
