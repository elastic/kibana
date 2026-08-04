import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
/** @internal */
export interface ExpressionLegacyMetricPluginSetup {
    expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
    charts: ChartsPluginSetup;
}
/** @internal */
export interface ExpressionLegacyMetricPluginStart {
    fieldFormats: FieldFormatsStart;
    usageCollection?: UsageCollectionStart;
}
/** @internal */
export declare class ExpressionLegacyMetricPlugin implements Plugin {
    setup(core: CoreSetup<ExpressionLegacyMetricPluginStart, void>, { expressions, charts }: ExpressionLegacyMetricPluginSetup): void;
    start(core: CoreStart, { fieldFormats }: ExpressionLegacyMetricPluginStart): void;
}
