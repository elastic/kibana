import { BehaviorSubject } from 'rxjs';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { LensSuggestionsApi, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedHistogramSuggestionContext, UnifiedHistogramVisContext, LensVisServiceState } from '../types';
import { UnifiedHistogramExternalVisContextStatus } from '../types';
import { type QueryParams } from '../utils/external_vis_context';
interface Services {
    data: DataPublicPluginStart;
}
interface LensVisServiceParams {
    services: Services;
    lensSuggestionsApi: LensSuggestionsApi;
}
export declare class LensVisService {
    state$: BehaviorSubject<LensVisServiceState>;
    private services;
    private lensSuggestionsApi;
    prevUpdateContext: {
        queryParams: QueryParams;
        timeInterval: string | undefined;
        breakdownField: DataViewField | undefined;
        table: Datatable | undefined;
        onSuggestionContextChange?: (suggestionContext: UnifiedHistogramSuggestionContext | undefined) => void;
        onVisContextChanged?: (visContext: UnifiedHistogramVisContext | undefined, externalVisContextStatus: UnifiedHistogramExternalVisContextStatus) => void;
    } | undefined;
    constructor({ services, lensSuggestionsApi }: LensVisServiceParams);
    update: ({ externalVisContext, queryParams, timeInterval, breakdownField, table, onSuggestionContextChange, onVisContextChanged, getModifiedVisAttributes, }: {
        externalVisContext: UnifiedHistogramVisContext | undefined;
        queryParams: QueryParams;
        timeInterval: string | undefined;
        breakdownField: DataViewField | undefined;
        table?: Datatable;
        onSuggestionContextChange?: (suggestionContext: UnifiedHistogramSuggestionContext | undefined) => void;
        onVisContextChanged?: (visContext: UnifiedHistogramVisContext | undefined, externalVisContextStatus: UnifiedHistogramExternalVisContextStatus) => void;
        getModifiedVisAttributes?: (attributes: TypedLensByValueInput["attributes"]) => TypedLensByValueInput["attributes"];
    }) => LensVisServiceState;
    onSuggestionEdited: ({ editedSuggestionContext, }: {
        editedSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
    }) => UnifiedHistogramVisContext | undefined;
    private getCurrentSuggestionState;
    private getDefaultHistogramSuggestion;
    private getHistogramSuggestionForESQL;
    private getESQLHistogramQuery;
    private getAllSuggestions;
    private getLensAttributesState;
}
export {};
