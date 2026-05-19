import React from 'react';
import { Position } from '@elastic/charts';
import type { EuiIconProps } from '@elastic/eui';
import type { IconPosition, ReferenceLineDecorationConfig, MergedAnnotation } from '../../common/types';
import type { AxesMap } from './axes_configuration';
export declare const LINES_MARKER_SIZE = 20;
type PartialReferenceLineDecorationConfig = Pick<ReferenceLineDecorationConfig, 'icon' | 'iconPosition' | 'textVisibility'> & {
    position?: Position;
};
type PartialMergedAnnotation = Pick<MergedAnnotation, 'position' | 'icon' | 'textVisibility' | 'label' | 'isGrouped' | 'color'>;
export declare const isAnnotationConfig: (config: PartialReferenceLineDecorationConfig | PartialMergedAnnotation) => config is PartialMergedAnnotation;
export declare const getLinesCausedPaddings: (visualConfigs: Array<PartialReferenceLineDecorationConfig | PartialMergedAnnotation | undefined>, axesMap: AxesMap, shouldRotate: boolean) => Partial<Record<Position, number>>;
export declare function mapVerticalToHorizontalPlacement(placement: Position): "right" | "top" | "left" | "bottom";
export declare function MarkerBody({ label, isHorizontal, }: {
    label: string | undefined;
    isHorizontal: boolean;
}): React.JSX.Element | null;
export declare const getGroupedAnnotationTextColor: (backgroundColor: string) => string;
export declare const AnnotationIcon: ({ type, rotateClassName, isHorizontal, renderedInChart, color, ...rest }: {
    type: string;
    rotateClassName?: string;
    isHorizontal?: boolean;
    renderedInChart?: boolean;
} & EuiIconProps) => React.JSX.Element | null;
interface MarkerConfig {
    position?: Position;
    icon?: string;
    textVisibility?: boolean;
    iconPosition?: IconPosition;
    color?: string;
}
export declare function Marker({ config, isHorizontal, hasReducedPadding, label, rotateClassName, }: {
    config: MarkerConfig;
    isHorizontal: boolean;
    hasReducedPadding: boolean;
    label?: string;
    rotateClassName?: string;
}): React.JSX.Element | null;
export {};
