import { NumeralFormat } from './numeral';
import { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class CurrencyFormat extends NumeralFormat {
    static id: FIELD_FORMAT_IDS;
    static title: string;
    id: FIELD_FORMAT_IDS;
    title: string;
    allowsNumericalAggregations: boolean;
}
