import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-common';
export declare const MAX_TOOLTIP_FIELDS_SIZE = 3;
export interface FieldInputsProps {
    currentConfig: QueryPointEventAnnotationConfig;
    setConfig: (config: QueryPointEventAnnotationConfig) => void;
    dataView: DataView;
    invalidFields?: string[];
}
export declare function TooltipSection({ currentConfig, setConfig, dataView }: FieldInputsProps): React.JSX.Element;
