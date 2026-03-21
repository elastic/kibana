import moment from 'moment';
import type { Unit } from '@kbn/datemath';
export interface EsInterval {
    expression: string;
    unit: Unit;
    value: number;
}
/**
 * Convert a moment.duration into an es
 * compatible expression, and provide
 * associated metadata
 *
 * @param  {moment.duration} duration
 * @return {object}
 */
export declare function convertDurationToNormalizedEsInterval(duration: moment.Duration, targetUnit?: Unit): EsInterval;
export declare function convertIntervalToEsInterval(interval: string): EsInterval;
declare module 'moment' {
    interface Locale {
        _config: moment.LocaleSpecification;
    }
}
export declare function getPreciseDurationDescription(intervalValue: number, unit: moment.unitOfTime.Base): string;
