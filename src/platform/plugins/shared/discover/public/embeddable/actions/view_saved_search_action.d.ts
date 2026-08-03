import type { ApplicationStart } from '@kbn/core/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { DiscoverAppLocator } from '../../../common';
export declare class ViewSavedSearchAction implements Action<EmbeddableApiContext> {
    private readonly application;
    private readonly locator;
    id: string;
    readonly type = "ACTION_VIEW_SAVED_SEARCH";
    readonly order = 20;
    constructor(application: ApplicationStart, locator: DiscoverAppLocator);
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
    getDisplayName(): string;
    getIconType(): string | undefined;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
}
