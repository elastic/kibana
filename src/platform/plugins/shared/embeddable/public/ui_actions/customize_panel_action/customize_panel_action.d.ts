import type { TracksOverlays } from '@kbn/presentation-util';
import type { CanAccessViewMode, EmbeddableApiContext, HasParentApi, PublishesDataViews, PublishesWritableUnifiedSearch, PublishesWritableDescription, PublishesWritableTitle, PublishesUnifiedSearch, IsCustomizable, PublishesWritableHideBorder } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type CustomizePanelActionApi = CanAccessViewMode & IsCustomizable & Partial<PublishesDataViews & PublishesWritableUnifiedSearch & PublishesWritableDescription & PublishesWritableTitle & PublishesWritableHideBorder & HasParentApi<Partial<PublishesUnifiedSearch & TracksOverlays>>>;
export declare const isApiCompatibleWithCustomizePanelAction: (api: unknown | null) => api is CustomizePanelActionApi;
export declare class CustomizePanelAction implements Action<EmbeddableApiContext> {
    type: string;
    id: string;
    order: number;
    constructor();
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    getIconType(): string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
