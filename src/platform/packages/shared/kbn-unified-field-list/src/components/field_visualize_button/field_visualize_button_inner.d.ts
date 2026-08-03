import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { VisualizeInformation } from './visualize_trigger_utils';
interface FieldVisualizeButtonInnerProps {
    field: DataViewField;
    visualizeInfo: VisualizeInformation;
    handleVisualizeLinkClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
    buttonProps?: Partial<EuiButtonProps>;
}
export declare const FieldVisualizeButtonInner: React.FC<FieldVisualizeButtonInnerProps>;
export {};
