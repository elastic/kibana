import type { EmbeddableComponentProps, LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramChartProps } from '../components/chart/chart';
import type { UnifiedHistogramExternalVisContextStatus, UnifiedHistogramServices, UnifiedHistogramVisContext, UnifiedHistogramFetchParamsExternal } from '../types';
import type { UnifiedHistogramStateOptions, UnifiedHistogramStateService } from '../services/state_service';
import type { UnifiedHistogramLayoutProps } from '../components/layout/layout';
export type UseUnifiedHistogramProps = Omit<UnifiedHistogramStateOptions, 'services'> & {
    /**
     * Required services
     */
    services: UnifiedHistogramServices;
    /**
     * Flag indicating that the chart is currently loading
     */
    isChartLoading?: boolean;
    /**
     * Allows users to enable/disable default actions
     */
    withDefaultActions?: EmbeddableComponentProps['withDefaultActions'];
    /**
     * Disabled action IDs for the Lens embeddable
     */
    disabledActions?: LensEmbeddableInput['disabledActions'];
    /**
     * Callback to pass to the Lens embeddable to handle filter changes
     */
    onFilter?: LensEmbeddableInput['onFilter'];
    /**
     * Callback to pass to the Lens embeddable to handle brush events
     */
    onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
    /**
     * Callback to update the breakdown field -- should set {@link UnifiedHistogramBreakdownContext.field} to breakdownField
     */
    onBreakdownFieldChange?: (breakdownField: string | undefined) => void;
    /**
     * Callback to update the time interval for the histogram chart
     */
    onTimeIntervalChange?: (timeInterval: string | undefined) => void;
    /**
     * Callback to notify about the change in Lens attributes
     */
    onVisContextChanged?: (nextVisContext: UnifiedHistogramVisContext | undefined, externalVisContextStatus: UnifiedHistogramExternalVisContextStatus) => void;
};
export type UnifiedHistogramApi = {
    /**
     * Trigger a fetch of the data
     */
    fetch: (params: UnifiedHistogramFetchParamsExternal) => void;
} & Pick<UnifiedHistogramStateService, 'state$' | 'setChartHidden' | 'setTopPanelHeight' | 'setTotalHits' | 'setLensRequestAdapter'>;
export type UnifiedHistogramPartialLayoutProps = Omit<UnifiedHistogramLayoutProps, 'container' | 'unifiedHistogramChart'>;
type UnifiedHistogramPartialChartProps = Omit<UnifiedHistogramChartProps, 'renderToggleActions'>;
export type UseUnifiedHistogramResult = {
    isInitialized: false;
    api: UnifiedHistogramApi;
    chartProps?: undefined;
    layoutProps?: undefined;
} | {
    isInitialized: true;
    api: UnifiedHistogramApi;
    chartProps: UnifiedHistogramPartialChartProps;
    layoutProps: UnifiedHistogramPartialLayoutProps;
};
export declare const useUnifiedHistogram: (props: UseUnifiedHistogramProps) => UseUnifiedHistogramResult;
export {};
