import type { Observable } from 'rxjs';
import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { EventAnnotationConfig, EventAnnotationGroupConfig, EventAnnotationGroupContent } from '@kbn/event-annotation-common';
export interface EventAnnotationServiceType {
    /** Emits the annotation group ID whenever a library annotation group is updated */
    annotationGroupUpdated$: Observable<string>;
    loadAnnotationGroup: (savedObjectId: string) => Promise<EventAnnotationGroupConfig>;
    groupExistsWithTitle: (title: string) => Promise<boolean>;
    findAnnotationGroupContent: (searchTerm: string, pageSize: number, tagsToInclude?: string[], tagsToExclude?: string[]) => Promise<{
        total: number;
        hits: EventAnnotationGroupContent[];
    }>;
    deleteAnnotationGroups: (ids: string[]) => Promise<void>;
    createAnnotationGroup: (group: EventAnnotationGroupConfig) => Promise<{
        id: string;
    }>;
    updateAnnotationGroup: (group: EventAnnotationGroupConfig, savedObjectId: string) => Promise<void>;
    toExpression: (props: EventAnnotationConfig[]) => ExpressionAstExpression[];
    toFetchExpression: (props: {
        interval: string;
        groups: Array<Pick<EventAnnotationGroupConfig, 'annotations' | 'ignoreGlobalFilters' | 'indexPatternId'>>;
    }) => ExpressionAstExpression[];
    renderEventAnnotationGroupSavedObjectFinder: (props: {
        fixedPageSize?: number;
        onChoose: (value: {
            id: string;
            type: string;
            fullName: string;
            savedObject: SavedObjectCommon;
        }) => void;
        onCreateNew: () => void;
    }) => JSX.Element;
}
