import type { StartServicesAccessor } from '@kbn/core/public';
import type { EventAnnotationPluginStart, EventAnnotationStartDependencies } from '../plugin';
import type { FetchEventAnnotationsExpressionFunctionDefinition, FetchEventAnnotationsStartDependencies } from '../../common/fetch_event_annotations';
export declare function fetchEventAnnotations({ getStartDependencies, }: {
    getStartDependencies: () => Promise<FetchEventAnnotationsStartDependencies>;
}): FetchEventAnnotationsExpressionFunctionDefinition;
export declare function getFetchEventAnnotations({ getStartServices, }: {
    getStartServices: StartServicesAccessor<EventAnnotationStartDependencies, EventAnnotationPluginStart>;
}): FetchEventAnnotationsExpressionFunctionDefinition;
