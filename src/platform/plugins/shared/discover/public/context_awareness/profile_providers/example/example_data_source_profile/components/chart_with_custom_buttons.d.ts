import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import React from 'react';
import type { ContextAwarenessToolkitActions } from '../../../../toolkit';
interface ChartWithCustomButtonsProps extends ChartSectionProps {
    actions: Pick<ContextAwarenessToolkitActions, 'openInNewTab' | 'updateESQLQuery'>;
}
export declare const ChartWithCustomButtons: ({ actions, ...props }: ChartWithCustomButtonsProps) => React.JSX.Element | null;
export {};
