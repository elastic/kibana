import type { VisualizeEmbeddable as VisualizeEmbeddableType } from './visualize_embeddable';
/** @deprecated
 * VisualizeEmbeddable is no longer registered with the legacy embeddable system and is only
 * used within the visualize editor.
 */
export declare const createVisualizeEmbeddableAsync: (...args: ConstructorParameters<typeof VisualizeEmbeddableType>) => Promise<VisualizeEmbeddableType>;
