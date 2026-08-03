import type { FC } from 'react';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { Position } from '@elastic/charts';
import type { ReferenceLineLayerConfig } from '../../../common/types';
import type { LayerAccessorsTitles, GroupsConfiguration, AxesMap } from '../../helpers';
import type { FormattersMap } from './utils';
interface ReferenceLineLayerProps {
    layer: ReferenceLineLayerConfig;
    paddingMap: Partial<Record<Position, number>>;
    isHorizontal: boolean;
    titles?: LayerAccessorsTitles;
    formatters: FormattersMap;
    xAxisFormatter: FieldFormat;
    axesConfiguration: GroupsConfiguration;
    yAxesMap: AxesMap;
}
export declare const ReferenceLineLayer: FC<ReferenceLineLayerProps>;
export {};
