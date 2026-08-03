import type { DataSourceProfileProvider } from '../../../profiles';
import { type ChangePointChartSectionProps$ } from './change_point_context';
import type { ChangePointPvalueCellContext } from './change_point_pvalue_cell';
/**
 * Extends the p-value cell context with the chart section props subject needed
 * by the flyout doc viewer tab.
 *
 * `DataSourceProfileProvider<TProviderContext>` merges this with the base
 * `DataSourceContext` (which already contributes `category`), so `category`
 * must NOT be included here.
 */
interface ChangePointDataSourceProfileContext extends ChangePointPvalueCellContext {
    chartSectionProps$: ChangePointChartSectionProps$;
}
export declare const createChangePointDataSourceProfileProvider: () => DataSourceProfileProvider<ChangePointDataSourceProfileContext>;
export {};
