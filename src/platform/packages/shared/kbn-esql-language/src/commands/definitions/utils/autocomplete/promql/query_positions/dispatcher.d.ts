import type { ESQLControlVariable } from '@kbn/esql-types';
import type { PromqlDetailedPosition, PromqlDetailedPositionType } from '../types';
import type { ISuggestionItem, ICommandContext } from '../../../../../registry/types';
export interface SuggestionContext {
    position: PromqlDetailedPosition;
    columns: ICommandContext['columns'] | undefined;
    shouldWrap: boolean;
    preGroupedAgg?: string;
    variables?: ESQLControlVariable[];
    supportsControls?: boolean;
}
export type SuggestionHandler = (input: SuggestionContext) => ISuggestionItem[];
export declare const positionHandlers: Partial<Record<PromqlDetailedPositionType, SuggestionHandler>>;
