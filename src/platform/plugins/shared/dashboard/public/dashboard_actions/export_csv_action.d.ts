import type { Action } from '@kbn/ui-actions-plugin/public';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type { EmbeddableApiContext, PublishesTitle } from '@kbn/presentation-publishing';
export type ExportContext = EmbeddableApiContext & {
    asString?: boolean;
};
export type ExportCsvActionApi = HasInspectorAdapters & Partial<PublishesTitle>;
export declare class ExportCSVAction implements Action<ExportContext> {
    readonly id = "ACTION_EXPORT_CSV";
    readonly type = "ACTION_EXPORT_CSV";
    readonly order = 2;
    grouping: {
        readonly id: "export_actions";
        readonly order: 9;
        readonly getIconType: () => string;
        readonly getDisplayName: () => string;
    }[];
    getIconType(): string;
    readonly getDisplayName: (context: ExportContext) => string;
    isCompatible({ embeddable }: ExportContext): Promise<boolean>;
    private hasDatatableContent;
    private getFormatter;
    private getDataTableContent;
    private exportCSV;
    execute({ embeddable, asString }: ExportContext): Promise<void>;
}
