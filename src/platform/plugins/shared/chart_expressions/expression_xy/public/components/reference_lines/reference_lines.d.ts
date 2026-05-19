import React from 'react';
import type { Position } from '@elastic/charts';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { CommonXYReferenceLineLayerConfig } from '../../../common/types';
import type { AxesMap, GroupsConfiguration, LayersAccessorsTitles } from '../../helpers';
import type { FormattersMap } from './utils';
export interface ReferenceLinesProps {
    layers: CommonXYReferenceLineLayerConfig[];
    xAxisFormatter: FieldFormat;
    axesConfiguration: GroupsConfiguration;
    isHorizontal: boolean;
    paddingMap: Partial<Record<Position, number>>;
    titles?: LayersAccessorsTitles;
    yAxesMap: AxesMap;
    formatters: FormattersMap;
}
export declare const ReferenceLines: ({ layers, titles, ...rest }: ReferenceLinesProps) => React.JSX.Element;
