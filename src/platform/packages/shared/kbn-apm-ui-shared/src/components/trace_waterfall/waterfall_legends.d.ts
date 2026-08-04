import type { IWaterfallLegend } from '@kbn/apm-types';
import { WaterfallLegendType } from '@kbn/apm-types';
import React from 'react';
interface Props {
    serviceName?: string;
    legends: IWaterfallLegend[];
    type: WaterfallLegendType;
}
export declare function WaterfallLegends({ serviceName, legends, type }: Props): React.JSX.Element;
export {};
