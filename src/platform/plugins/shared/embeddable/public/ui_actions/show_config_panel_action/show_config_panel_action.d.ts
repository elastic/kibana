import type { EmbeddableApiContext, CanAccessViewMode, HasReadOnlyCapabilities } from '@kbn/presentation-publishing';
import type { Action, FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
export type ShowConfigPanelActionApi = CanAccessViewMode & HasReadOnlyCapabilities;
export declare class ShowConfigPanelAction implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext> {
    readonly type = "ACTION_SHOW_CONFIG_PANEL";
    readonly id = "ACTION_SHOW_CONFIG_PANEL";
    order: number;
    constructor();
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext): import("rxjs").Observable<undefined> | undefined;
    couldBecomeCompatible({ embeddable }: EmbeddableApiContext): boolean;
    getIconType({ embeddable }: EmbeddableApiContext): string;
    /**
     * The compatible check is scoped to the read only capabilities
     * Note: it does not take into account write permissions
     */
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
