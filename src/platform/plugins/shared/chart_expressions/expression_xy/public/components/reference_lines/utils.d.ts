import React from 'react';
import { Position } from '@elastic/charts';
import type { FieldFormat, FormatFactory } from '@kbn/field-formats-plugin/common';
import type { IconPosition, ReferenceLineConfig, FillStyle, ExtendedReferenceLineDecorationConfig, ReferenceLineDecorationConfig, CommonXYReferenceLineLayerConfig } from '../../../common/types';
import type { GroupsConfiguration, AxesMap } from '../../helpers';
import type { ReferenceLineAnnotationConfig } from './reference_line_annotations';
export declare function getBaseIconPlacement(iconPosition: IconPosition | undefined, axesMap?: AxesMap, position?: Position): "right" | "top" | "left" | "bottom";
export declare const getSharedStyle: (config: ReferenceLineAnnotationConfig) => {
    strokeWidth: number;
    stroke: string;
    dash: number[] | undefined;
};
export declare const getLineAnnotationProps: (config: ReferenceLineAnnotationConfig, label: string | undefined, axesMap: AxesMap, isHorizontal: boolean, isTextOnlyMarker: boolean) => {
    groupId: string;
    marker: React.JSX.Element;
    markerBody: React.JSX.Element | undefined;
    markerPosition: "right" | "top" | "left" | "bottom";
};
export declare const getBottomRect: (headerLabel: string | undefined, isFillAbove: boolean, formatter: FieldFormat | undefined, currentValue?: number, nextValue?: number) => {
    coordinates: {
        x0: number | undefined;
        y0: undefined;
        x1: number | undefined;
        y1: undefined;
    };
    header: string | undefined;
    details: string | undefined;
};
export declare const getHorizontalRect: (headerLabel: string | undefined, isFillAbove: boolean, formatter: FieldFormat | undefined, currentValue?: number, nextValue?: number) => {
    coordinates: {
        x0: undefined;
        y0: number | undefined;
        x1: undefined;
        y1: number | undefined;
    };
    header: string | undefined;
    details: string | undefined;
};
export declare const getNextValuesForReferenceLines: (referenceLines: ReferenceLineConfig[]) => Record<FillStyle, Record<string, number | undefined>>;
export declare const computeChartMargins: (referenceLinePaddings: Partial<Record<Position, number>>, labelVisibility: Partial<Record<"x" | "yLeft" | "yRight", boolean>>, titleVisibility: Partial<Record<"x" | "yLeft" | "yRight", boolean>>, axesMap: AxesMap, isHorizontal: boolean) => Partial<Record<Position, number>>;
export declare function getAxisGroupForReferenceLine(axesConfiguration: GroupsConfiguration, decorationConfig: ReferenceLineDecorationConfig | ExtendedReferenceLineDecorationConfig, shouldRotate: boolean): import("../../helpers").AxisConfiguration | undefined;
export type FormattersMap = Record<string, FieldFormat>;
export declare function getReferenceLinesFormattersMap(referenceLinesLayers: CommonXYReferenceLineLayerConfig[], formatFactory: FormatFactory): FormattersMap;
