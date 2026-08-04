import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CoreSetup, CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { EventAnnotationPluginStart } from '@kbn/event-annotation-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { ExpressionXyPluginSetup, ExpressionXyPluginStart, SetupDeps } from './types';
export interface XYPluginStartDependencies {
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    charts: ChartsPluginStart;
    eventAnnotation: EventAnnotationPluginStart;
    usageCollection?: UsageCollectionStart;
}
export declare function getTimeZone(uiSettings: IUiSettingsClient): any;
export declare class ExpressionXyPlugin {
    setup(core: CoreSetup<XYPluginStartDependencies>, { expressions, charts: _charts }: SetupDeps): ExpressionXyPluginSetup;
    start(_core: CoreStart): ExpressionXyPluginStart;
    stop(): void;
}
