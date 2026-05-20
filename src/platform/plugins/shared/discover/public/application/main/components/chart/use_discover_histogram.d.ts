import type { UnifiedHistogramApi, UseUnifiedHistogramProps } from '@kbn/unified-histogram';
import { type InitialUnifiedHistogramLayoutProps } from '../../state_management/redux';
export interface UseUnifiedHistogramOptions {
    initialLayoutProps?: InitialUnifiedHistogramLayoutProps;
}
export declare const useDiscoverHistogram: (options?: UseUnifiedHistogramOptions) => UseUnifiedHistogramProps & {
    setUnifiedHistogramApi: (api: UnifiedHistogramApi) => void;
};
