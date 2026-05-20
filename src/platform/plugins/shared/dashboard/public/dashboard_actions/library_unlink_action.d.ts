import type { CanAccessViewMode, EmbeddableApiContext, HasLibraryTransforms, HasParentApi, HasType, HasUniqueId, PublishesTitle, PresentationContainer } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type UnlinkPanelFromLibraryActionApi = CanAccessViewMode & HasLibraryTransforms & HasType & HasUniqueId & HasParentApi<Pick<PresentationContainer, 'replacePanel'>> & Partial<PublishesTitle>;
export declare const isApiCompatible: (api: unknown | null) => api is UnlinkPanelFromLibraryActionApi;
export declare class UnlinkFromLibraryAction implements Action<EmbeddableApiContext> {
    readonly type = "unlinkFromLibrary";
    readonly id = "unlinkFromLibrary";
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
