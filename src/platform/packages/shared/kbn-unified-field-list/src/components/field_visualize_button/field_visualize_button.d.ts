import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { type VisualizeInformation } from './visualize_trigger_utils';
export interface FieldVisualizeButtonProps {
    field: DataViewField;
    dataView: DataView;
    originatingApp: string;
    uiActions: UiActionsStart;
    multiFields?: DataViewField[];
    contextualFields?: string[];
    trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
    buttonProps?: Partial<EuiButtonProps>;
    visualizeInfo?: VisualizeInformation;
}
export declare const FieldVisualizeButton: React.FC<FieldVisualizeButtonProps>;
export declare function getFieldVisualizeButton(props: FieldVisualizeButtonProps): Promise<React.JSX.Element | null>;
