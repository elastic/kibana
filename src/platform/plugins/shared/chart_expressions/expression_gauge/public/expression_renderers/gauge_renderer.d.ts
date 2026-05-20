import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import type { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { ExpressionGaugePluginStart } from '../plugin';
import type { GaugeExpressionProps } from '../../common';
interface ExpressionGaugeRendererDependencies {
    getStartDeps: StartServicesGetter<ExpressionGaugePluginStart>;
}
export declare const gaugeRenderer: (deps: ExpressionGaugeRendererDependencies) => ExpressionRenderDefinition<GaugeExpressionProps>;
export {};
