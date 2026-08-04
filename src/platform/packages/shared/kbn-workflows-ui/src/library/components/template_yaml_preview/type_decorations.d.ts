import type { Document } from 'yaml';
import { monaco } from '@kbn/monaco';
/** Base class Monaco adds to the `type:` value span; the icon CSS keys off it. */
export declare const INLINE_HIGHLIGHT_CLASS = "type-inline-highlight";
/** CSS class suffix for a step type. Aggregated by base connector type so e.g. `slack.postMessage` and `slack.reply` share one icon. */
export declare const getStepTypeCssClass: (type: string) => string;
/** CSS class suffix for a trigger type. */
export declare const getTriggerTypeCssClass: (type: string) => string;
/** A `type` value found in the workflow body, with the CSS class its inline decoration carries. */
export interface UsedType {
    type: string;
    kind: 'step' | 'trigger';
    cssClass: string;
}
export interface TypeDecorations {
    decorations: monaco.editor.IModelDeltaDecoration[];
    usedTypes: UsedType[];
}
export interface ComputeTypeDecorationsOptions {
    /**
     * Gate for trigger `type` decorations. The YAML walk matches any `type:`
     * under a `triggers` node, which includes a trigger's `inputs[].type`; this
     * predicate keeps only real trigger types (built-in or registered), matching
     * the workflow editor's behavior.
     */
    isTriggerTypeAllowed?: (type: string) => boolean;
}
/**
 * Compute the inline `type:` decorations for a workflow YAML document plus the
 * distinct step/trigger types they reference (so the caller can resolve icons).
 */
export declare function computeTypeDecorations(model: monaco.editor.ITextModel, doc: Document, { isTriggerTypeAllowed }?: ComputeTypeDecorationsOptions): TypeDecorations;
