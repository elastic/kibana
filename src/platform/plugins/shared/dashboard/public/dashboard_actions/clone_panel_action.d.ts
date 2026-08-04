import type { CanDuplicatePanels, IsDuplicable, CanAccessViewMode, EmbeddableApiContext, HasParentApi, PublishesBlockingError, HasSerializableState, HasUniqueId } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type ClonePanelActionApi = CanAccessViewMode & HasSerializableState & HasUniqueId & HasParentApi<CanDuplicatePanels> & Partial<PublishesBlockingError> & IsDuplicable;
export declare class ClonePanelAction implements Action<EmbeddableApiContext> {
    readonly type = "clonePanel";
    readonly id = "clonePanel";
    order: number;
    grouping: {
        readonly id: "dashboard_actions";
        readonly order: 10;
    }[];
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    getIconType({ embeddable }: EmbeddableApiContext): string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
