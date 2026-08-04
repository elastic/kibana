import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import type { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { ExpressionMetricPluginStart } from '../plugin';
import type { MetricVisRenderConfig } from '../../common';
interface ExpressionMetricVisRendererDependencies {
    getStartDeps: StartServicesGetter<ExpressionMetricPluginStart>;
}
export declare const getMetricVisRenderer: (deps: ExpressionMetricVisRendererDependencies) => (() => ExpressionRenderDefinition<MetricVisRenderConfig>);
export {};
