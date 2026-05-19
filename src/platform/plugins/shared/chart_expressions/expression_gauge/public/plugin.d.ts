import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
/** @internal */
export interface ExpressionGaugePluginSetup {
    expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
    charts: ChartsPluginSetup;
}
/** @internal */
export interface ExpressionGaugePluginStart {
    fieldFormats: FieldFormatsStart;
    usageCollection?: UsageCollectionStart;
    charts: ChartsPluginStart;
}
/** @internal */
export declare class ExpressionGaugePlugin {
    setup(core: CoreSetup<ExpressionGaugePluginStart, void>, { expressions, charts }: ExpressionGaugePluginSetup): void;
    start(core: CoreStart, { fieldFormats }: ExpressionGaugePluginStart): void;
}
