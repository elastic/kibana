import type { HasEditCapabilities, EmbeddableApiContext, CanAccessViewMode } from '@kbn/presentation-publishing';
import type { Action, FrequentCompatibilityChangeAction } from '@kbn/ui-actions-plugin/public';
export type EditPanelActionApi = CanAccessViewMode & HasEditCapabilities;
export declare class EditPanelAction implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext> {
    readonly type = "editPanel";
    readonly id = "editPanel";
    order: number;
    constructor();
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext): import("rxjs").Observable<undefined> | undefined;
    couldBecomeCompatible({ embeddable }: EmbeddableApiContext): boolean;
    getIconType(): string;
    getHref({ embeddable }: EmbeddableApiContext): Promise<string | undefined>;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
