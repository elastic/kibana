import type { AggregateQuery, Query } from '@kbn/es-query';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { type PresentationContainer } from '@kbn/presentation-publishing';
import { ESQL_CONTROL } from '@kbn/controls-constants';
type EsqlControlState = OptionsListESQLControlState & {
    type: typeof ESQL_CONTROL;
};
interface EsqlControlsState {
    [uuid: string]: EsqlControlState;
}
export declare function getAllEsqlControls(presentationContainer: PresentationContainer): EsqlControlsState;
export declare function getEsqlControls(presentationContainer: PresentationContainer, query: AggregateQuery | Query | undefined): {
    [k: string]: EsqlControlState;
} | undefined;
export {};
