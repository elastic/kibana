import type { Plugin, CoreStart, CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
interface ESQLDataGridPluginStart {
    data: DataPublicPluginStart;
    uiActions: UiActionsStart;
    fieldFormats: FieldFormatsStart;
    share?: SharePluginStart;
}
export declare class ESQLDataGridPlugin implements Plugin<{}, void> {
    setup(_: CoreSetup, {}: {}): {};
    start(core: CoreStart, { data, uiActions, fieldFormats, share }: ESQLDataGridPluginStart): void;
    stop(): void;
}
export {};
