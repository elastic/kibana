import type { FC } from 'react';
import type { Position } from '@elastic/charts';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { ReferenceLineConfig } from '../../../common/types';
import type { AxesMap, GroupsConfiguration } from '../../helpers';
import type { FormattersMap } from './utils';
interface ReferenceLineProps {
    layer: ReferenceLineConfig;
    paddingMap: Partial<Record<Position, number>>;
    xAxisFormatter: FieldFormat;
    formatters: FormattersMap;
    axesConfiguration: GroupsConfiguration;
    isHorizontal: boolean;
    nextValue?: number;
    yAxesMap: AxesMap;
}
export declare const ReferenceLine: FC<ReferenceLineProps>;
export {};
