import type { TooltipInfo } from '@elastic/charts';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import type { FC } from 'react';
import type { CommonXYDataLayerConfig } from '../../../common';
import type { DatatablesWithFormatInfo, LayersAccessorsTitles, LayersFieldFormats } from '../../helpers';
import type { XDomain } from '../x_domain';
type Props = TooltipInfo & {
    xDomain?: XDomain;
    fieldFormats: LayersFieldFormats;
    titles?: LayersAccessorsTitles;
    formatFactory: FormatFactory;
    formattedDatatables: DatatablesWithFormatInfo;
    splitAccessors?: {
        splitRowAccessor?: string;
        splitColumnAccessor?: string;
    };
    layers: CommonXYDataLayerConfig[];
};
export declare const Tooltip: FC<Props>;
export {};
