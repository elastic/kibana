import type { CanAccessViewMode, EmbeddableApiContext, HasLibraryTransforms, HasParentApi, HasType, HasTypeDisplayName, HasUniqueId, PublishesTitle, PresentationContainer } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type AddPanelToLibraryActionApi = CanAccessViewMode & HasType & HasUniqueId & HasLibraryTransforms & HasParentApi<Pick<PresentationContainer, 'replacePanel'>> & Partial<PublishesTitle & HasTypeDisplayName>;
export declare class AddToLibraryAction implements Action<EmbeddableApiContext> {
    readonly type = "saveToLibrary";
    readonly id = "saveToLibrary";
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
