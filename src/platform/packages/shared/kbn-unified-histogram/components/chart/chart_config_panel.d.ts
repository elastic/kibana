import type { AggregateQuery, Query } from '@kbn/es-query';
import type { LensEmbeddableOutput } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramChartLoadEvent, UnifiedHistogramServices, UnifiedHistogramSuggestionContext, UnifiedHistogramVisContext } from '../../types';
export declare function ChartConfigPanel({ services, visContext, lensAdapters, dataLoading$, currentSuggestionContext, isFlyoutVisible, setIsFlyoutVisible, isPlainRecord, query, onSuggestionContextEdit, }: {
    services: UnifiedHistogramServices;
    visContext: UnifiedHistogramVisContext;
    isFlyoutVisible: boolean;
    setIsFlyoutVisible: (flag: boolean) => void;
    lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
    dataLoading$?: LensEmbeddableOutput['dataLoading$'];
    currentSuggestionContext: UnifiedHistogramSuggestionContext;
    isPlainRecord?: boolean;
    query?: Query | AggregateQuery;
    onSuggestionContextEdit: (suggestion: UnifiedHistogramSuggestionContext | undefined) => void;
}): JSX.Element | null;
