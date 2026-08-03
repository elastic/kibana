import type { EmbeddableApiContext, HasLibraryTransforms, HasParentApi, HasSerializableState, HasType, HasTypeDisplayName, HasUniqueId, PublishesTitle } from '@kbn/presentation-publishing';
import { type SupportsJsonExport } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type ExportJSONActionApi = SupportsJsonExport & HasUniqueId & HasType & PublishesTitle & HasSerializableState & Partial<HasParentApi> & Partial<HasTypeDisplayName> & Partial<HasLibraryTransforms>;
export declare class ExportJSONAction implements Action<EmbeddableApiContext> {
    readonly id = "exportJson";
    readonly type = "exportJson";
    readonly order = 1;
    grouping: {
        readonly id: "export_actions";
        readonly order: 9;
        readonly getIconType: () => string;
        readonly getDisplayName: () => string;
    }[];
    getIconType(): string;
    readonly getDisplayName: (context: EmbeddableApiContext) => string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
