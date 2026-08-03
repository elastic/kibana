import type { EmbeddableApiContext, HasParentApi, HasUniqueId, PublishesViewMode, PresentationContainer } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type RemovePanelActionApi = PublishesViewMode & HasUniqueId & HasParentApi<PresentationContainer>;
export declare class RemovePanelAction implements Action<EmbeddableApiContext> {
    readonly type = "deletePanel";
    readonly id = "deletePanel";
    order: number;
    grouping: {
        id: string;
        order: number;
    }[];
    constructor();
    getDisplayName(): string;
    getIconType(): string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
