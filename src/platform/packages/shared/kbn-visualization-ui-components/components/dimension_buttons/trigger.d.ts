import React from 'react';
import type { EuiTextProps } from '@elastic/eui/src/components/text/text';
export declare const defaultDimensionTriggerTooltip: React.JSX.Element;
export declare const DimensionTrigger: ({ id, label, color, dataTestSubj, }: {
    label: React.ReactNode;
    id?: string;
    color?: EuiTextProps["color"];
    dataTestSubj?: string;
}) => React.JSX.Element;
