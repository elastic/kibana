import type { FC } from 'react';
import type { unitOfTime } from 'moment';
import type { TooltipValue } from '@elastic/charts';
interface EndzonesProps {
    isDarkMode: boolean;
    domainStart: number;
    domainEnd: number;
    interval: number;
    domainMin: number;
    domainMax: number;
    hideTooltips?: boolean;
    /**
     * used to toggle full bin endzones for multiple non-stacked bars
     */
    isFullBin?: boolean;
}
export declare const Endzones: FC<EndzonesProps>;
/**
 * Returns the adjusted interval based on the data
 *
 * @param xValues sorted and unquie x values
 * @param esValue
 * @param esUnit
 * @param timeZone
 */
export declare const getAdjustedInterval: (xValues: number[], esValue: number, esUnit: unitOfTime.Base, timeZone: string) => number;
export declare const renderEndzoneTooltip: (xInterval?: number, domainStart?: number, domainEnd?: number, formatter?: (v: any) => string, renderValue?: boolean) => (headerData: TooltipValue) => JSX.Element | string;
export {};
