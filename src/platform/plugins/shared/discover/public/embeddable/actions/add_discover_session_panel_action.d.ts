import type { ApplicationStart } from '@kbn/core/public';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DiscoverAppLocator } from '../../../common';
export declare class AddDiscoverSessionPanelAction implements Action<EmbeddableApiContext> {
    private readonly application;
    private readonly locator;
    private readonly embeddable;
    id: string;
    readonly type = "ACTION_ADD_DISCOVER_SESSION_PANEL";
    readonly order = 45;
    readonly grouping: {
        id: string;
        getDisplayName: () => string;
        getIconType: () => string;
        order: number;
    }[];
    constructor(application: ApplicationStart, locator: DiscoverAppLocator, embeddable: EmbeddableStart);
    getIconType(): string | undefined;
    getDisplayName(): string;
    execute({ embeddable: embeddableApi, }: ActionExecutionContext<EmbeddableApiContext>): Promise<void>;
    getDisplayNameTooltip(): string;
    isCompatible({ embeddable }: ActionExecutionContext<EmbeddableApiContext>): Promise<boolean>;
}
