import type { PromqlDetailedPosition, PromqlDetailedPositionType } from '../types';
import type { ISuggestionItem, ICommandContext } from '../../../../../registry/types';
export interface SuggestionContext {
    position: PromqlDetailedPosition;
    columns: ICommandContext['columns'] | undefined;
    shouldWrap: boolean;
    preGroupedAgg?: string;
}
export type SuggestionHandler = (input: SuggestionContext) => ISuggestionItem[];
export declare const positionHandlers: Partial<Record<PromqlDetailedPositionType, SuggestionHandler>>;
