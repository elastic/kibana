import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionPosition } from '../position';
import type { ExpressionContext } from '../types';
export declare function dispatchStates(context: ExpressionContext, position: ExpressionPosition): Promise<ISuggestionItem[]>;
