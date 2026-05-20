import type { UseUnifiedHistogramProps } from '@kbn/unified-histogram';
interface UnifiedHistogramCustomizationId {
    id: 'unified_histogram';
}
export type UnifiedHistogramCustomization = UnifiedHistogramCustomizationId & Pick<UseUnifiedHistogramProps, 'onFilter' | 'onBrushEnd' | 'withDefaultActions' | 'disabledActions'>;
export {};
