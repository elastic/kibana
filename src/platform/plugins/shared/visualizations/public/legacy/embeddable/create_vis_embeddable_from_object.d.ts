import type { Vis } from '../../types';
import type { VisualizeInput, VisualizeEmbeddable, VisualizeEmbeddableDeps } from './visualize_embeddable';
import type { AttributeService } from './attribute_service';
import { ErrorEmbeddable } from './error_embeddable';
/** @deprecated
 * VisualizeEmbeddable is no longer registered with the legacy embeddable system and is only
 * used within the visualize editor.
 */
export declare const createVisEmbeddableFromObject: (deps: VisualizeEmbeddableDeps) => (vis: Vis, input: Partial<VisualizeInput> & {
    id: string;
}, attributeService?: AttributeService) => Promise<VisualizeEmbeddable | ErrorEmbeddable>;
