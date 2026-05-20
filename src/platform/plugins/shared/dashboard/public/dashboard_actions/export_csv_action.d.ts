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
    readonly order = 18;
    getIconType(): string;
    readonly getDisplayName: (context: ExportContext) => string;
    isCompatible({ embeddable }: ExportContext): Promise<boolean>;
    private hasDatatableContent;
    private getFormatter;
    private getDataTableContent;
    private exportCSV;
    execute({ embeddable, asString }: ExportContext): Promise<void>;
}
