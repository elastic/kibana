import type { CanExpandPanels, IsExpandable, EmbeddableApiContext, HasParentApi, HasUniqueId } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type ExpandPanelActionApi = HasUniqueId & HasParentApi<CanExpandPanels> & IsExpandable;
export declare class ExpandPanelAction implements Action<EmbeddableApiContext> {
    readonly type = "togglePanel";
    readonly id = "togglePanel";
    order: number;
    grouping: {
        readonly id: "dashboard_actions";
        readonly order: 10;
    }[];
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    getIconType({ embeddable }: EmbeddableApiContext): "expand" | "minimize";
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    couldBecomeCompatible({ embeddable }: EmbeddableApiContext): boolean;
    getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext): import("rxjs").Observable<undefined> | undefined;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
