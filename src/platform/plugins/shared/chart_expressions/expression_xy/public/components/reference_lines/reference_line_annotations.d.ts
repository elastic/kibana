import { Position } from '@elastic/charts';
import type { FC } from 'react';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { AxesMap, AxisConfiguration } from '../../helpers';
import type { AvailableReferenceLineIcon, FillStyle, IconPosition, LineStyle } from '../../../common/types';
export interface ReferenceLineAnnotationConfig {
    id: string;
    name?: string;
    value?: number;
    nextValue?: number;
    icon?: AvailableReferenceLineIcon;
    lineWidth?: number;
    lineStyle?: LineStyle;
    fill?: FillStyle;
    iconPosition?: IconPosition;
    textVisibility?: boolean;
    axisGroup?: AxisConfiguration;
    color?: string;
}
interface Props {
    config: ReferenceLineAnnotationConfig;
    paddingMap: Partial<Record<Position, number>>;
    formatter?: FieldFormat;
    axesMap: AxesMap;
    isHorizontal: boolean;
}
export declare const ReferenceLineAnnotations: FC<Props>;
export {};
