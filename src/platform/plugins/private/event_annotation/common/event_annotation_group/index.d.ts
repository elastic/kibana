import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { IndexPatternExpressionType } from '@kbn/data-views-plugin/common';
import type { EventAnnotationOutput } from '../types';
export interface EventAnnotationGroupOutput {
    type: 'event_annotation_group';
    annotations: EventAnnotationOutput[];
    ignoreGlobalFilters: boolean;
    dataView: IndexPatternExpressionType;
}
export interface EventAnnotationGroupArgs {
    annotations: EventAnnotationOutput[];
    dataView: IndexPatternExpressionType;
    ignoreGlobalFilters: boolean;
}
export declare function eventAnnotationGroup(): ExpressionFunctionDefinition<'event_annotation_group', null, EventAnnotationGroupArgs, EventAnnotationGroupOutput>;
