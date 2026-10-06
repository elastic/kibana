import type { monaco } from '../../../../monaco_imports';
import type { ParsedRequest } from '../../types';
/**
 * Walks the parsed requests backwards from the cursor and returns the start position of the
 * request the cursor most plausibly belongs to. When an earlier request's content shows that a
 * later "request" is really text inside its triple-quoted JSON value, that earlier request wins,
 * so parser recovery artifacts inside strings never become anchors. All model reads are capped.
 */
export declare const getFallbackRequestStartPosition: (parsedRequests: ParsedRequest[], model: monaco.editor.ITextModel, positionLineNumber: number, positionColumn?: number) => monaco.IPosition | undefined;
