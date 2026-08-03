import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type { EmbeddableApiContext, HasParentApi, PublishesTitle } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type InspectPanelActionApi = HasInspectorAdapters & Partial<PublishesTitle & HasParentApi>;
export declare class InspectPanelAction implements Action<EmbeddableApiContext> {
    readonly type = "openInspector";
    readonly id = "openInspector";
    order: number;
    grouping: {
        readonly id: "export_actions";
        readonly order: 9;
        readonly getIconType: () => string;
        readonly getDisplayName: () => string;
    }[];
    constructor();
    getDisplayName(): string;
    getIconType: () => string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
