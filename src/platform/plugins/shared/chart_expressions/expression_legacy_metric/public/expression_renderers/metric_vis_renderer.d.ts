import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import type { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { ExpressionLegacyMetricPluginStart } from '../plugin';
import type { MetricVisRenderConfig } from '../../common';
/** @internal **/
export interface ExpressionMetricVisRendererDependencies {
    getStartDeps: StartServicesGetter<ExpressionLegacyMetricPluginStart>;
}
export declare const getMetricVisRenderer: (deps: ExpressionMetricVisRendererDependencies) => ExpressionRenderDefinition<MetricVisRenderConfig>;
